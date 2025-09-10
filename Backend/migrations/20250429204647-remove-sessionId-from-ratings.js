'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Önce foreign key kısıtlamasını kaldır (eğer varsa ve adı biliniyorsa)
    // Kısıtlama adı genellikle 'ratings_ibfk_X' veya benzeridir, veritabanından kontrol etmek gerekebilir.
    // Eğer adı bilmiyorsak veya hata alırsak, sadece removeColumn deneyebiliriz.
    // await queryInterface.removeConstraint('Ratings', 'ratings_ibfk_12'); // ÖRNEK KISITLAMA ADI
    
    await queryInterface.removeColumn('Ratings', 'sessionId');
  },

  async down(queryInterface, Sequelize) {
    // sessionId kolonunu geri ekle (eski Session modeline referans ile)
    // Bu, Session tablosunun hala var olduğunu varsayar, bu yüzden dikkatli olunmalı.
    await queryInterface.addColumn('Ratings', 'sessionId', {
      type: Sequelize.INTEGER,
      allowNull: false, // Veya modeldeki orijinal durum
      references: {
        model: 'Sessions', // Session tablo adı
        key: 'id',
      },
      onDelete: 'CASCADE', // Orijinal onDelete kuralı
      onUpdate: 'CASCADE', // Orijinal onUpdate kuralı
    });
  }
};
