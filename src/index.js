const dotenv = require("dotenv");
const db = require("./models");

dotenv.config();
const express = require("express");
const app = express();
const { tag_openmrs_anc2_anc1 } = require("./models");

const readData = require("./database/builder");
const {
  postAncData,
  getObsByEncounterUuid,
  deleteObs,
} = require("./openmrs/openmrs-api");

const port = process.env.PORT;

app.get("/", async (req, res) => {
  res.send(
    "PTracker node app,  incorrectly captured ANC 2nd visit to ANC 1st visit!"
  );
  const data = await readData.readData(tag_openmrs_anc2_anc1);
  if (data.length <= 0) {
    console.log("*********No ANC data to update*****");
    return;
  }
  console.log("********* Please wait while updating ANC data *****");
  const d = await Promise.all(
    data.map(async (item, index) => {
      console.log(item.dataValues.uuid);

      const encouterWithObs = await getObsByEncounterUuid(
        item.dataValues["uuid"],
        item.dataValues
      );
      const returnVisitObs = await encouterWithObs.body.obs.find(
        (obj) => obj.display === "Visit type: Return ANC Visit"
      );

      if (returnVisitObs) {
        const deletedObs = await deleteObs(
          returnVisitObs.uuid,
          item.dataValues
        );

        console.log(deletedObs);
      }

      const data = await postAncData(item.dataValues);
      console.log(data.body);
    })
  );
  if (d) {
    console.log(
      "**************************** ANC update done ***************************"
    );
    return;
  }
});

db.sequelize
  .sync()
  .then((req) => {
    app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });
  })
  .then(async (req) => {
    console.log("Database connection successful");
  })
  .catch((err) => {
    console.log("Database connection failed");
  });
