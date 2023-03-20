// Creamos instancia de CommunityConnector.
const cc = DataStudioApp.createCommunityConnector();

// Establecemos el método de autenticación para nuestro conector
function getAuthType() {
  const AuthTypes = cc.AuthType;
  return cc.newAuthTypeResponse().setAuthType(AuthTypes.NONE).build();
}

// Si devuelve true los mensajes de errores se muestran en la interfaz de Looker Studio.
// Si devuelve false el usuario no obtiene ningún contexto del error.
function isAdminUser() {
  return true;
}

// Establece que información debe ser brindada por el usuario para que el conector obtenga los datos de una API externa.
function getConfig() {
  const config = cc.getConfig();
  config
    .newTextInput()
    .setId("account_sid")
    .setName("Enter SID")
    .setPlaceholder("SID");
  config.setDateRangeRequired(true);
  return config.build();
}

// Define el esquema de datos a generar en Looker Studio.
function getFields() {
  const fields = cc.getFields();
  const types = cc.FieldType;
  fields
    .newDimension()
    .setId("account_name")
    .setName("Account Name")
    .setType(types.TEXT);
  fields
    .newDimension()
    .setId("date_sent")
    .setName("Date Sent")
    .setType(types.YEAR_MONTH_DAY);
  fields
    .newDimension()
    .setId("direction")
    .setName("Messages Sent")
    .setType(types.TEXT);
  return fields;
}

// Wrapper para devolver el objeto de esquema generado por getFields().
function getSchema(request) {
  return { schema: getFields().build() };
}

function getData(request) {
  // Variable a la cual asignaremos los datos obtenidos del API.
  let data;
  // Array con los nombres de las columnas del esquema de datos.
  const requestedFieldIds = request.fields.map(function (field) {
    return field.name;
  });
  // Objeto de tipo Fields que junto a los datos obtenidos de la API devuelve la estructura de datos final.
  const requestedFields = getFields().forIds(requestedFieldIds);
  try {
    // Llamada a la API para obtener datos.
    const apiResponse = fetchDataFromApi(request);
    // Formateo de los datos obtenidos para que su estructura sea igual a la del esquema.
    data = formatData(requestedFields, apiResponse);
  } catch (e) {
    // Si isAdminUser() devuelve true esta parte del código es la encargada de mostrar el error en Looker Studio
    cc.newUserError()
      .setDebugText("Error fetching data from API. Exception details: \n" + e)
      .setText(
        "The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists."
      )
      .throwException();
  }
  return {
    schema: requestedFields.build(),
    rows: data,
  };
}

function fetchDataFromApi(request) {
  const params = {
    method: "get",
    contentType: "application/json",
  };
  // Podemos utilizar el servicio de PropertiesService para hacer uso de valores que no queremos exponer en el código/
  // https://developers.google.com/apps-script/reference/properties/properties-service?hl=es-419
  const endpoint =
    PropertiesService.getScriptProperties().getProperty("endpoint");
  // Accedemos a parámetros de configuración y de fechas por medio del objeto request y creamos nuestro URL.
  const queryParams =
    "account_sid=" +
    request.configParams.account_sid +
    "&from_date=" +
    request.dateRange.startDate +
    "&to_date=" +
    request.dateRange.endDate;
  const apiEndpoint = endpoint + queryParams;
  const response = UrlFetchApp.fetch(apiEndpoint, params);
  // Devolvemos el JSON obtenido de la API.
  return JSON.parse(response);
}

function formatData(requestedFields, response) {
  return response.map(function (smsData) {
    const row = [];
    requestedFields.asArray().forEach(function (field) {
      switch (field.getId()) {
        case "account_name":
          return row.push(smsData.account_name);
        case "date_sent":
          return row.push(smsData.date_sent);
        case "direction":
          return row.push(smsData.direction);
        default:
          return row.push("");
      }
    });
    return { values: row };
  });
}
