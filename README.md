# Conector de datos para Looker Studio.

**Looker Studio** (antes Data Studio) es una herramienta versátil y extremadamente útil cuando se trata de **visualizar datos**, sin mencionar que la versión gratuita es más que suficiente para la mayoría de casos de uso ya que cuenta con conectores para múltiples fuentes de datos desde **BigQuery, bases de datos SQL, Google Sheets** y la lista continúa. 

Aún considerando esto es posible que alguna fuente de dato que necesites no este disponible o quizá tu quieres estructurar los datos de una manera más conveniente y para estos casos escribo este artículo, en el que te enseñaré como desarrollar tu propio **Community Connector** para Looker Studio.

Comencemos…

Este proyecto lo llevaremos acabo en **Google Apps Script** (GAPPS) el cuál funcionara como nuestro IDE y también será el lugar donde se ejecutará el código del conector cuando ya lo integremos en Looker Studio, si nunca has trabajando en esta plataforma te doy una breve introducción:

Para acceder ve al siguiente [url](https://script.google.com/home), el layout debería resultarte familiar ya que Google posee un estándar de UX/UI muy similar en todos sus servicios, en la pantalla de bienvenida verás tu lista de proyectos y a lado izquierdo el botón de **Nuevo Proyecto,** al dar clic serás llevado a la interfaz dónde pasaremos el resto del artículo.

![Screenshot 2023-03-19 at 14.42.48.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/07f27f89-7920-4bcc-bae5-644c48f9e1c2/Screenshot_2023-03-19_at_14.42.48.png)

En la interfaz de tu **Nuevo Proyecto** notarás que la mayor parte esta dedicada al editor de código el cual automáticamente genera un archivo llamado **Código.gs.** Probablemente te preguntes ¿cuál lenguaje de programación usa este tipo de archivos? No te preocupes, no hay que aprender ningún lenguaje esotérico para usar esta plataforma ya que corre en **JavaScript**, por tanto mientras sepas programar en este lenguaje, es todo lo que necesitas en términos de conocimiento técnico.

![Screenshot 2023-03-19 at 14.52.33.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/1cb6a9db-998b-4435-b9fe-c08a8b8f0226/Screenshot_2023-03-19_at_14.52.33.png)

Para obtener el código de muestra clona el siguiente repositorio de GitHub, el conector de ejemplo obtiene datos de mensajes de texto enviados en [Twilio](https://www.twilio.com/).

```bash
git clone https://github.com/luigicfh/revelo_looker_studio_connector.git
```

Al acceder al repositorio desde tu IDE de preferencia, ve al archivo **Code.js** y copia el código para pegarlo dentro del editor en GAPPS. A continuación examinemos las funciones que componen un conector y su propósito:

Todo conector se inicia creando una instancia de **CommunityConnector** llamando a la clase [DataStudioApp](https://developers.google.com/apps-script/reference/data-studio/data-studio-app?hl=es-419) y su método [createCommunityConnector()](https://developers.google.com/apps-script/reference/data-studio/data-studio-app?hl=es-419#createCommunityConnector()), este nos permitirá acceder a los métodos y atributos que proveen a Looker Studio con los elementos necesarios para estructurar los datos y mostrarlos en widgets como tablas y gráficos.

```jsx
// Creamos instancia de CommunityConnector.
const cc = DataStudioApp.createCommunityConnector();
```

La función **getAuthType()** determina el método de autenticación que quieres establecer en la configuración del conector, esto muy útil si quieres aplicar algún tipo de restricción o una capa de seguridad adicional para que solo usuarios autorizados puedan integrarlo en sus dashboards, el atributo [AuthType](https://developers.google.com/apps-script/reference/data-studio/auth-type?hl=es-419) devuelve una enumeración que define los tipos de autenticación que se pueden configurar para un conector, en la tabla a continuación puedes más detalles sobre los autenticación permitidos.

| Propiedad | Tipo | Descripción |
| --- | --- | --- |
| NONE | Enum | No se necesita autorización. |
| OAUTH2 | Enum | Se requiere autorización de OAuth2. |
| USER_PASS | Enum | Se necesitan credenciales de nombre de usuario y contraseña. |
| PATH_USER_PASS | Enum | Se requieren el nombre de usuario, la ruta de acceso y la contraseña. |
| PATH_KEY | Enum | Se necesita una ruta y una clave. |
| KEY | Enum | Se necesita un token o una clave de API. |
| USER_TOKEN | Enum | Se necesitan un nombre de usuario y un token. |

Establecemos el método de autenticación deseado por medio del siguiente código **cc.newAuthTypeResponse().setAuthType(AuthTypes.NONE).build()**, Looker Studio automáticamente requerirá la información para autenticar al usuario al momento de configurar el conector. En este caso yo he establecido NONE así que mi conector no requiere autenticación para ser integrado.

```jsx
// Establecemos el método de autenticación para nuestro conector
function getAuthType() {
  const AuthTypes = cc.AuthType;
  return cc.newAuthTypeResponse().setAuthType(AuthTypes.NONE).build();
}
```

La siguiente función es bastante sencilla pero su rol no es menos importante ya que te ayudará con una acción que todo desarrollador debe llevar acabo más de una vez en todos sus proyectos y esta es… **Debugging**, cuando estas en fase de desarrollo y prueba de tu conector es recomendable que la función **isAdminUser()** devuelva **true** ya que si algo sale mal, la interfaz de Looker Studio te mostrará el mensaje del error y tendrás un mejor contexto de que hay que corregir para resolverlo, cuando estés listo para publicar tu conector cambia el valor a **false** para que los usuarios finales no tengan acceso al mensaje de error, ya que no solo podría generar confusión sino también podrías exponer información de tu código como endpoints o datos no públicos.

```jsx
// Si devuelve true los mensajes de errores se muestran en la interfaz de Looker Studio.
// Si deveulve false el usuario no obtiene ningún contexto del error.
function isAdminUser() {
  return true;
}
```

Ahora veamos la función **getConfig()**, acá defines que información necesitas que el usuario brinde para que tu conector la pueda utilizar en una llamada a un API externo, estos datos serán almacenados en la configuración del conector y tu puedes acceder a ellos para pasarlos como **query parameters**. También cabe notar que el siguiente fragmento de código: **config.setDateRangeRequired(true)** hará que el conector cree parámetros de rango de fechas los cuales se obtienen de controles de tipo **Date Range** en la interfaz de creación de dashboards en Looker Studio, esto es extremadamente útil si quieres aplicar filtros de fechas en la consulta que hagas al API externo.

```jsx
// Establece que información debe ser brindada por el usuario para que el conector obtega los datos de una API externa.

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
```

Es momento de empezar a dar estructura a los datos que nuestro conector mostrará en Looker Studio, el propósito la función **getFields()** es construir el esquema de los datos que se obtengan más adelante, esto es muy similar a agregar columnas en una tabla de base de datos SQL. Dentro de Looker Studio una columna es llamada **Dimension** y a cada una se le definen tres atributos:

- ID (nombre interno al que podemos hacer referencia en el código)
- Nombre (nombre visible al usuario)
- Tipo (tipo de dato que esta columna produce)

Looker Studio hará uso de la función **getSchema(request)** para llamar a **getFields()** y construir el esquema después de obtener los datos de una API externa.

```jsx
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
```

Pasemos a la parte final del código dónde obtendremos los datos a mostrar en Looker Studio haciendo una llamada a nuestra API externa (el código de la API queda fuera del alcance de este artículo), esta parte del proceso esta compuesta de 3 funciones:

- getData
- fetchDataFromApi
- formatData

Comencemos con **getData(request)**, esta es la función nativa de Looker Studio que se encarga de obtener y formatear los datos pasando como único argumento el objeto **request**, este trae consigo (entre otras cosas) los nombres de los campos del esquema de datos en el atributo **fields**, creamos un Array a partir de los nombres de las columnas para luego hacer uso de la función **getFields().forIds(requestedFieldNames)** que devuelve un objeto de tipo **Fields**, este junto a los datos obtenidos de la API devuelve la estructura de datos final.

```jsx
// Variable a la cual asignaremos los datos obtenidos del API.
let data;
// Array con los nombres de las columnas del esquema de datos.
const requestedFieldNames = request.fields.map(function (field) {
  return field.name;
});
// Objeto de tipo Fields que junto a los datos obtenidos de la API devuelve la estructura de datos final.
const requestedFields = getFields().forIds(requestedFieldNames);
```

Pasamos a el siguiente bloque de código dentro de **getData(request)** donde haremos uso de las dos funciones restantes, una para hacer la solicitud a la API y obtener el JSON con los datos de la respuesta.

```jsx
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
```

La función **fetchDataFromApi(request)** que acepta como único parámetro el objeto request y hace una solicitud **GET** a la API de donde obtenemos los datos de Twilio, notemos que el objeto **request** es quién nos da acceso a los parámetros guardados en la configuración del conector como también los de rango de fecha enviados por el **widget** desde la interfaz de Looker Studio.

```jsx
function fetchDataFromApi(request) {
  const headers = {
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
  const response = UrlFetchApp.fetch(apiEndpoint, headers);

	// Devolvemos el JSON obtenido de la API.
  return JSON.parse(response);
}
```

La función **formatData(requestedFields, response)** toma como arguments el objeto **Fields** y la respuesta del API, por medio de iteraciones de los datos, las columnas y una switch statement damos forma a las filas de modo que el orden de los datos iguale el de las columnas del esquema. El resultado es un Array con las filas de datos en el orden y estructura correcta para que Looker Studio pueda generar tablas y gráficos a partir de esta.

```jsx
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
```

Finalmente **getData(request)** puede devolver un objeto con la estructura de datos que Looker Studio espera. Veamos la función completa a continuación.

```jsx
function getData(request) {
	// Variable a la cual asignaremos los datos obtenidos del API.
  let data;
	// Array con los nombres de las columnas del esquema de datos.
  const requestedFieldNames = request.fields.map(function (field) {
    return field.name;
  });
	// Devuelve objeto de tipo Fields que junto a los datos obtenidos de la API devuelve la estructura de datos final.
  const requestedFields = getFields().forIds(requestedFieldNames);
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
```

Si bien hemos terminado el código de nuestro conector, aún faltan algunos pasos para poder realizar pruebas en Looker Studio.

Primero vamos a las configuraciones del proyecto para habilitar la opción **“Mostrar el archivo de manifiesto "appsscript.json" en el editor”**, esto mostrará un archivo nuevo el cual es un simple JSON al que agregaremos atributos adicionales que habilitan a nuestro conector para que este disponible en Looker Studio de manera privada y así realizar pruebas. El producto final del manifiesto debería verse como este ejemplo:

```json
{
  "timeZone": "America/El_Salvador",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "dataStudio": {
    "name": "Twilio SMS Sent Connector",
    "logoUrl": "http://localhost/",
    "company": "Revelo",
    "companyUrl": "http://localhost/",
    "supportUrl": "http://localhost/",
    "description": "A Looker Studio connector for fetching data from Twilio.",
    "addOnUrl": "http://localhost/"
  }
}
```

Habiendo finalizado el punto anterior puedes ir a [Looker Studio](https://lookerstudio.google.com/u/0/navigation/reporting) y en **Crear > Fuente de datos**, busca tu conector por el nombre que le diste en el manifiesto configura los parámetros requeridos y empieza a visualizar tus datos.

Hasta acá llega este artículo, espero que sea de mucha utilidad y que puedas crear tu primer conector pronto. Hasta la próxima y happy coding!