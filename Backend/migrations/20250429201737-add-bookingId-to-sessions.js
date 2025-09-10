'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Sessions', 'bookingId', {
      type: Sequelize.INTEGER,
      allowNull: true, // Veya false, modele göre karar verin
      references: {
        model: 'Bookings', // Tablo adı (genellikle çoğul)
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Veya 'CASCADE' booking silinince session da silinsin isteniyorsa
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Sessions', 'bookingId');
  }
};
