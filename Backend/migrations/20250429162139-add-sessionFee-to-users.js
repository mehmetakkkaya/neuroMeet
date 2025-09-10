'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'sessionFee', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      // defaultValue: 0.00, // İsterseniz bir varsayılan değer ayarlayabilirsiniz
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'sessionFee');
  }
};
