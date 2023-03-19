const cc = DataStudioApp.createCommunityConnector();

function getAuthType() {
  const AuthTypes = cc.AuthType;
  return cc.newAuthTypeResponse().setAuthType(AuthTypes.NONE).build();
}

function isAdminUser() {
  return true;
}

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

function getSchema(request) {
  return { schema: getFields().build() };
}

function getData(request) {
  var data;
  var requestedFieldIds = request.fields.map(function (field) {
    return field.name;
  });
  var requestedFields = getFields().forIds(requestedFieldIds);
  try {
    const apiResponse = fetchDataFromApi(request);
    data = formatData(requestedFields, apiResponse);
  } catch (e) {
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
  const endpoint =
    PropertiesService.getScriptProperties().getProperty("endpoint");
  const queryParams =
    "account_sid=" +
    request.configParams.account_sid +
    "&from_date=" +
    request.dateRange.startDate +
    "&to_date=" +
    request.dateRange.endDate;
  const apiEndpoint = endpoint + queryParams;
  var response = UrlFetchApp.fetch(apiEndpoint, params);
  return JSON.parse(response);
}

function formatData(requestedFields, response) {
  return response.map(function (smsData) {
    var row = [];
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
