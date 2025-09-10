const User = require('../models/userModel');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { client } = require('../config/elasticsearch'); // Elasticsearch client
const { INDEX_NAME } = require('../utils/createTherapistNameIndex'); // Index adı

// @desc    Get all therapists
// @route   GET /api/therapists
// @access  Public
const getAllTherapists = async (req, res) => {
  try {
    const therapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'active' 
      },
      attributes: { 
        exclude: ['password'] 
      }
    });
    
    res.json(therapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get therapist by ID
// @route   GET /api/therapists/:id
// @access  Public
const getTherapistById = async (req, res) => {
  try {
    const therapist = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'therapist',
        status: 'active'
      },
      attributes: { 
        exclude: ['password'] 
      }
    });

    if (therapist) {
      res.json({
        id: therapist.id,
        name: therapist.name,
        email: therapist.email,
        profilePicture: therapist.profilePicture,
        specialty: therapist.specialty,
        bio: therapist.bio,
        educationBackground: therapist.educationBackground,
        yearsOfExperience: therapist.yearsOfExperience
      });
    } else {
      res.status(404).json({ message: 'Terapist bulunamadı' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search therapists by name, specialty
// @route   GET /api/therapists/search
// @access  Public
const searchTherapists = async (req, res) => {
  try {
    const { name, specialty } = req.query;
    const whereConditions = { 
      role: 'therapist',
      status: 'active'
    };

    if (name) {
      whereConditions.name = { [Op.like]: `%${name}%` };
    }

    if (specialty) {
      whereConditions.specialty = { [Op.like]: `%${specialty}%` };
    }

    const therapists = await User.findAll({
      where: whereConditions,
      attributes: { 
        exclude: ['password'] 
      }
    });

    res.json(therapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get therapists by specialty
// @route   GET /api/therapists/specialty/:specialty
// @access  Public
const getTherapistsBySpecialty = async (req, res) => {
  try {
    const therapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'active',
        specialty: { [Op.like]: `%${req.params.specialty}%` }
      },
      attributes: { 
        exclude: ['password'] 
      }
    });
    
    res.json(therapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all available specialties
// @route   GET /api/therapists/specialties
// @access  Public
const getAllSpecialties = async (req, res) => {
  try {
    // Find all active therapists
    const therapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'active',
        specialty: { 
          [Op.not]: null,
          [Op.ne]: ''
        }
      },
      attributes: ['specialty']
    });
    
    // Extract unique specialties
    const specialtiesSet = new Set();
    therapists.forEach(therapist => {
      if (therapist.specialty) {
        // Handle comma-separated specialties
        const specialtyList = therapist.specialty.split(',');
        specialtyList.forEach(s => specialtiesSet.add(s.trim()));
      }
    });
    
    const specialties = Array.from(specialtiesSet).sort();
    res.json(specialties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get top rated therapists
// @route   GET /api/therapists/top-rated
// @access  Public
const getTopRatedTherapists = async (req, res) => {
  try {
    // Currently we don't have a rating system, so we'll just return active therapists
    // This can be enhanced once a rating system is implemented
    const therapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'active' 
      },
      attributes: { 
        exclude: ['password'] 
      },
      limit: 5
    });
    
    res.json(therapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get therapist full profile (for therapist's own viewing)
// @route   GET /api/therapists/my-profile
// @access  Private/Therapist
const getTherapistProfile = async (req, res) => {
  try {
    // req.user is set by auth middleware
    if (req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Sadece terapistler kendi profillerini görüntüleyebilir' });
    }
    
    const therapist = await User.findByPk(req.user.id);
    
    if (therapist) {
      const therapistData = {
        id: therapist.id,
        name: therapist.name,
        email: therapist.email,
        role: therapist.role,
        profilePicture: therapist.profilePicture,
        phone: therapist.phone,
        dateOfBirth: therapist.dateOfBirth,
        gender: therapist.gender,
        address: therapist.address,
        specialty: therapist.specialty,
        licenseNumber: therapist.licenseNumber,
        educationBackground: therapist.educationBackground,
        yearsOfExperience: therapist.yearsOfExperience,
        bio: therapist.bio,
        status: therapist.status,
        lastLogin: therapist.lastLogin,
        createdAt: therapist.createdAt
      };
      
      res.json(therapistData);
    } else {
      res.status(404).json({ message: 'Terapist bulunamadı' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update therapist profile (for therapist's own updating)
// @route   PUT /api/therapists/my-profile
// @access  Private/Therapist
const updateTherapistProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // req.user is set by auth middleware
    if (req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Sadece terapistler kendi profillerini güncelleyebilir' });
    }
    
    const therapist = await User.findByPk(req.user.id);
    
    if (therapist) {
      // Basic fields
      therapist.name = req.body.name || therapist.name;
      therapist.email = req.body.email || therapist.email;
      therapist.phone = req.body.phone || therapist.phone;
      therapist.dateOfBirth = req.body.dateOfBirth || therapist.dateOfBirth;
      therapist.gender = req.body.gender || therapist.gender;
      therapist.address = req.body.address || therapist.address;
      therapist.profilePicture = req.body.profilePicture || therapist.profilePicture;
      
      // Therapist specific fields
      therapist.specialty = req.body.specialty || therapist.specialty;
      therapist.educationBackground = req.body.educationBackground || therapist.educationBackground;
      therapist.yearsOfExperience = req.body.yearsOfExperience || therapist.yearsOfExperience;
      therapist.bio = req.body.bio || therapist.bio;
      
      // Password update if provided
      if (req.body.password) {
        therapist.password = req.body.password;
      }
      
      await therapist.save();
      
      res.json({
        id: therapist.id,
        name: therapist.name,
        email: therapist.email,
        specialty: therapist.specialty,
        bio: therapist.bio,
        message: 'Terapist profili başarıyla güncellendi'
      });
    } else {
      res.status(404).json({ message: 'Terapist bulunamadı' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending therapist approvals (for admin)
// @route   GET /api/therapists/pending-approval
// @access  Private/Admin
const getPendingTherapists = async (req, res) => {
  try {
    const pendingTherapists = await User.findAll({
      where: { 
        role: 'therapist',
        status: 'pending' 
      },
      attributes: { 
        exclude: ['password'] 
      }
    });
    
    res.json(pendingTherapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve therapist (for admin)
// @route   PUT /api/therapists/approve/:id
// @access  Private/Admin
const approveTherapist = async (req, res) => {
  try {
    const therapist = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'therapist',
        status: 'pending'
      }
    });
    
    if (therapist) {
      therapist.status = 'active';
      await therapist.save();
      
      res.json({
        message: 'Terapist başarıyla onaylandı',
        therapist: {
          id: therapist.id,
          name: therapist.name,
          email: therapist.email,
          status: therapist.status
        }
      });
    } else {
      res.status(404).json({ message: 'Onay bekleyen terapist bulunamadı' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject therapist (for admin)
// @route   PUT /api/therapists/reject/:id
// @access  Private/Admin
const rejectTherapist = async (req, res) => {
  try {
    const therapist = await User.findOne({
      where: { 
        id: req.params.id,
        role: 'therapist',
        status: 'pending'
      }
    });
    
    if (therapist) {
      therapist.status = 'inactive';
      await therapist.save();
      
      res.json({
        message: 'Terapist başvurusu reddedildi',
        therapist: {
          id: therapist.id,
          name: therapist.name,
          email: therapist.email,
          status: therapist.status
        }
      });
    } else {
      res.status(404).json({ message: 'Onay bekleyen terapist bulunamadı' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get therapist pending dashboard (for therapists waiting approval)
// @route   GET /api/therapists/pending-dashboard
// @access  Private/Therapist (including pending)
const getTherapistPendingDashboard = async (req, res) => {
  try {
    // req.user JWT token'dan gelir
    if (req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Sadece terapistler bu sayfaya erişebilir' });
    }
    
    const therapist = await User.findByPk(req.user.id);
    
    if (!therapist) {
      return res.status(404).json({ message: 'Terapist bulunamadı' });
    }
    
    // Sadece gerekli olan alanları gönder
    const pendingDashboardData = {
      id: therapist.id,
      name: therapist.name,
      email: therapist.email,
      status: therapist.status,
      role: therapist.role,
      profilePicture: therapist.profilePicture,
      specialty: therapist.specialty,
      registrationDate: therapist.createdAt,
      message: therapist.status === 'pending' 
        ? 'Hesabınız şu anda inceleme aşamasındadır. Onaylandıktan sonra size bildirim yapılacaktır.' 
        : therapist.status === 'active' 
          ? 'Hesabınız onaylanmıştır. Tüm özelliklere erişebilirsiniz.' 
          : 'Hesabınız şu anda aktif değil.',
      estimatedWaitTime: '24-48 saat',
      nextSteps: [
        'Hesabınız onaylanana kadar bekleyiniz',
        'Onay sonrası mail adresinize bildirim gönderilecektir',
        'Onay sonrası profil bilgilerinizi tamamlayabilirsiniz',
        'Uygunluk saatlerinizi ayarlayabilirsiniz'
      ],
      supportContact: 'support@neuromeet.com'
    };
    
    res.json(pendingDashboardData);
  } catch (error) {
    console.error('Pending dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Elasticsearch ile terapist adına göre ara
// @route   GET /api/therapists/search-name
// @access  Public (veya kimlik doğrulamalı)
const searchTherapistsByNameES = async (req, res) => {
  const { name } = req.query;

  if (!name || name.toString().trim().length < 2) { 
    return res.status(400).json({ message: 'Arama terimi en az 2 karakter olmalıdır' });
  }

  try {
    // === PING KONTROLÜ KALDIRILDI ===
    // Artık doğrudan search işlemini deniyoruz.
    // Bağlantı hatası olursa veya sunucu hata dönerse aşağıdaki catch bloğu yakalayacak.
    // === ===
    
    const searchTerm = name.toString().trim();

    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            filter: [ { term: { status: 'active' } } ],
            must: [
               {
                 match: {
                   "name.edge_ngram_completion": {
                      query: searchTerm,
                      operator: "and" 
                   }
                 }
               }
            ]
          }
        },
        size: 15 
      }
    });

    const therapists = response.hits.hits.map(hit => ({
      id: hit._source.mysqlId,
      name: hit._source.name
    }));
    
    res.json(therapists);

  } catch (error) {
    // Hata loglamayı detaylandıralım
    console.error('ES isim arama genel hatası:', error); 
    if (error.meta && error.meta.body) { // Elasticsearch'ten gelen body'yi logla (eğer varsa)
        console.error('Elasticsearch Hata Detayı (Body):', error.meta.body);
    }
    // Kullanıcıya daha genel bir hata mesajı göster
    res.status(500).json({ message: 'Arama sırasında bir sunucu hatası oluştu' });
  }
};

// @desc    Get session fee for a specific therapist
// @route   GET /api/therapists/:id/session-fee
// @access  Public
const getTherapistSessionFee = async (req, res) => {
  try {
    const therapist = await User.findOne({
      where: {
        id: req.params.id,
        role: 'therapist',
        status: 'active' // Sadece aktif terapistlerin ücretini göster
      },
      attributes: ['sessionFee'] // Sadece sessionFee alanını çek
    });

    if (therapist) {
      // Yanıtı { sessionFee: value } formatında gönder
      res.json({ sessionFee: therapist.sessionFee }); 
    } else {
      // Aktif terapist bulunamadıysa 404 hatası ver
      res.status(404).json({ message: 'Aktif terapist bulunamadı veya belirtilen ID\'ye sahip değil.' });
    }
  } catch (error) {
    console.error('Error fetching therapist session fee:', error);
    res.status(500).json({ message: 'Seans ücreti alınırken bir sunucu hatası oluştu.' });
  }
};

module.exports = {
  getAllTherapists,
  getTherapistById,
  searchTherapists,
  getTherapistsBySpecialty,
  getAllSpecialties,
  getTopRatedTherapists,
  getTherapistProfile,
  updateTherapistProfile,
  getPendingTherapists,
  approveTherapist,
  rejectTherapist,
  getTherapistPendingDashboard,
  searchTherapistsByNameES,
  getTherapistSessionFee
}; 