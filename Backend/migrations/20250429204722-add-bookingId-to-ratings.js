'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Ratings', 'bookingId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Bookings', // Bookings tablosuna referans
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Booking silinince ilgili Rating de silinsin
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Ratings', 'bookingId');
  }
};
