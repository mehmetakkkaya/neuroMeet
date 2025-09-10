'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Sessions tablosunu düşür
    await queryInterface.dropTable('Sessions');
  },

  async down(queryInterface, Sequelize) {
    // Bu işlemi geri almak karmaşık olabilir.
    console.warn('Dropping the Sessions table cannot be easily undone by this migration.');
    // Gerekirse, Sessions tablosunu yeniden oluşturacak kodu buraya ekleyin.
  }
};
