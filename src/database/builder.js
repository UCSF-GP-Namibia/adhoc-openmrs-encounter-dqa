// upsert record into MYSQL
var Sequelize = require("sequelize");
const Op = Sequelize.Op;

const readData = async (model) => {
  const foundItems = await model.findAll({
    limit:2,
    where: {
      [Op.or]: [{ status: null }],
    },  
    order: [['anc_date', 'DESC']] 
  });
  return foundItems;
};

module.exports = {
  readData,
};
