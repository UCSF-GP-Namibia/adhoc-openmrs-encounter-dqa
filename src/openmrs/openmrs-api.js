const request = require("request");
const config = require("../config/config.json");
const uuids = require("../config/uuid-dictionary.json");

const { tag_openmrs_anc2_anc1 } = require("../models");

const sendRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    request(options, (err, response, body) => {
      if (err) {
        tag_openmrs_anc2_anc1.update(
          {
            request_error: `${err}`,
          },
          {
            where: {
              uuid: data["uuid"],
            },
          }
        );
        return reject(`Error sending request to OpenMRS: ${err.message}`);
      }
      const contentType = response.headers["content-type"];
      if (contentType && contentType.indexOf("application/json") !== -1) {
        if (data["uuid"] != null) {
          tag_openmrs_anc2_anc1.update(
            {
              request_error: null,
            },
            {
              where: {
                uuid: data["uuid"],
              },
            }
          );
        }
        return resolve({ response: response, body: body });
      } else {
        return reject(null);
      }
    });
  });
};

const getObsByEncounterUuid = async (encounterUuid, ancData) => {
  let options = {
    method: "GET",
    url: `${config.openmrsConfig.apiURL}/encounter/${encounterUuid}`,
    qs: {},
    headers: config.openmrsConfig.headers,
    form: false,
    auth: {
      user: config.openmrsConfig.username,
      pass: config.openmrsConfig.password,
    },
    json: true,
  };
  return sendRequest(options, ancData);
};

const deleteObs = async (obsUuid, ancData) => {
  let options = {
    method: "DELETE",
    url: `${config.openmrsConfig.apiURL}/obs/${obsUuid}`,
    qs: {},
    headers: config.openmrsConfig.headers,
    form: false,
    auth: {
      user: config.openmrsConfig.username,
      pass: config.openmrsConfig.password,
    },
    json: true,
  };
  return sendRequest(options, ancData);
};

const postAncData = async (ancData) => {
  try {
    const data = await updateAncEcounters(ancData);

    if (data.response.statusCode == 200) {
      console.log(
        `******** Updating ANC2 to ANC1 for ${ancData["ptracker_identifier"]} *************`
      );
      tag_openmrs_anc2_anc1.update(
        {
          status: "updated",
        },
        {
          where: {
            uuid: ancData.uuid,
          },
        }
      );
      if (ancData["error"] != null) {
        tag_openmrs_anc2_anc1.update(
          {
            error: null,
          },
          {
            where: {
              uuid: ancData.uuid,
            },
          }
        );
      }
    } else {
      tag_openmrs_anc2_anc1.update(
        {
          error: `message: ${data.response.body.error.message} \n code: ${data.response.body.error.code} \n detail: ${data.response.body.error.detail}`,
        },
        {
          where: {
            uuid: ancData.uuid,
          },
        }
      );
    }
    return data;
  } catch (error) {
    console.log(error);
  }
};

const updateAncEcounters = async (ancData) => {
  const obs = await getObs(ancData);
  // console.log("to send", obs);
  let body = {
    form: uuids.forms.anc_form,
    obs,
  };
  let options = {
    method: "POST",
    url: `${config.openmrsConfig.apiURL}/encounter/${ancData.uuid}`,
    qs: {},
    headers: config.openmrsConfig.headers,
    form: false,
    auth: {
      user: config.openmrsConfig.username,
      pass: config.openmrsConfig.password,
    },
    json: true,
    body: body,
  };
  return sendRequest(options, ancData);
};

const getObs = async (data) => {
  // console.log("Getting obs", data);
  if (data) {
    let obs = [];
    // --ANC--
    //anc_first_visit
    if (data.visit_type) {
      if (data.visit_type == "Return ANC Visit") {
        obs.push({
          concept: uuids.obs.anc_first_visit,
          value: uuids.ancFirstYesNo["1"],
        });
      }
    }
    //anc_gravida
    if (data.gravida) {
      obs.push({
        concept: uuids.obs.missing_gravida,
        value: true,
      });
    } else {
      console.log("Missing anc_gravida");
    }
    //anc_para
    if (data.para) {
      obs.push({
        concept: uuids.obs.missing_para,
        value: true,
      });
    } else {
      console.log("Missing anc_para!");
    }
    //anc_lnmp
    if (data.LNMP == 'Missing') {
      obs.push({
        concept: uuids.obs.missing_anc_lnmp,
        value: true,
      });
    } else {
      obs.push({
        concept: uuids.obs.anc_lnmp,
        value: data.LNMP,
      }); 
    }
    //anc_edd
    if (data.EDD == 'Missing') {
      obs.push({
        concept: uuids.obs.missing_anc_edd,
        value: true,
      });
    } else {
      obs.push({
        concept: uuids.obs.anc_edd_calculated,
        value: data.EDD,
      });
    }
    return obs;
  } else {
    return [];
  }
};

module.exports = {
  sendRequest,
  getObs,
  updateAncEcounters,
  postAncData,
  getObsByEncounterUuid,
  deleteObs,
};
