const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const { validationResult } = require('express-validator');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (user && (await user.matchPassword(password))) {
      // Son giriş zamanını güncelle
      user.lastLogin = new Date();
      await user.save();

      // Terapist ve pending durumunda ise, özel bir alan ekle
      const isPendingTherapist = user.role === 'therapist' && user.status === 'pending';

      // Temel response data
      const responseData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        status: user.status,
        token: generateToken(user.id),
      };

      // Eğer bekleyen terapist ise, ek bilgiler ekle
      if (isPendingTherapist) {
        responseData.isPending = true;
        responseData.pendingMessage = 'Hesabınız onay bekliyor. Onay sürecinde bazı özelliklere erişiminiz kısıtlı olabilir.';
        responseData.pendingDashboardUrl = '/therapist/pending-dashboard';
      }

      res.json(responseData);
    } else {
      res.status(401);
      throw new Error('Geçersiz email veya şifre');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a customer
// @route   POST /api/users/register-customer
// @access  Public
const registerCustomer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, 
    email, 
    password, 
    phone, 
    dateOfBirth, 
    gender, 
    address 
  } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      res.status(400);
      throw new Error('Bu email adresi ile kayıtlı bir kullanıcı zaten var');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'customer',
      phone,
      dateOfBirth,
      gender,
      address,
      status: 'active'
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user.id),
      });
    } else {
      res.status(400);
      throw new Error('Geçersiz kullanıcı bilgileri');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a therapist
// @route   POST /api/users/register-therapist
// @access  Public
const registerTherapist = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    name, 
    email, 
    password, 
    phone, 
    dateOfBirth,
    gender,
    address,
    specialty,
    licenseNumber,
    educationBackground,
    yearsOfExperience,
    bio,
    sessionFee
  } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      res.status(400);
      throw new Error('Bu email adresi ile kayıtlı bir kullanıcı zaten var');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'therapist',
      phone,
      dateOfBirth,
      gender,
      address,
      specialty,
      licenseNumber,
      educationBackground,
      yearsOfExperience,
      bio,
      sessionFee,
      status: 'pending' // Terapistler admin onayı gerektiriyor
    });

    if (user) {
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user.id),
        isPending: true,
        message: 'Terapist kaydınız alınmıştır. Hesabınız yönetici onayı beklemektedir.',
        pendingDashboardUrl: '/therapist/pending-dashboard',
        instructions: [
          'Hesabınız onay sürecindedir. Bu süre genellikle 24-48 saat sürmektedir.',
          'Onay sürecinde terapist dashboard\'unuza erişebilir ve başvurunuzun durumunu kontrol edebilirsiniz.',
          'Onay sonrası takvim, randevu ve diğer özelliklere erişim kazanacaksınız.',
          'Sorularınız için support@neuromeet.com adresine e-posta gönderebilirsiniz.'
        ]
      });
    } else {
      res.status(400);
      throw new Error('Geçersiz kullanıcı bilgileri');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register an admin (only existing admins can create new admins)
// @route   POST /api/users/register-admin
// @access  Private/Admin
const registerAdmin = async (req, res) => {
  console.log('[registerAdmin] İstek alındı:', {
    body: req.body
  });

  // Geçici olarak yetki kontrolü devre dışı bırakıldı
  // if (!req.user || req.user.role !== 'admin') {
  //   console.error('[registerAdmin] Yetki hatası: Yetkili admin değil');
  //   return res.status(401).json({
  //     message: 'Bu işlemi gerçekleştirmek için admin yetkisi gereklidir'
  //   });
  // }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ where: { email } });

    if (userExists) {
      res.status(400);
      throw new Error('Bu email adresi ile kayıtlı bir kullanıcı zaten var');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'admin',
      status: 'active'
    });

    if (user) {
      console.log(`[registerAdmin] Admin oluşturuldu: ID=${user.id}, Email=${user.email}`);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user.id),
        message: 'Admin kullanıcı başarıyla oluşturuldu',
      });
    } else {
      res.status(400);
      throw new Error('Geçersiz kullanıcı bilgileri');
    }
  } catch (error) {
    console.error('[registerAdmin] Hata:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (user) {
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      };

      // Terapist ise ek bilgileri ekle
      if (user.role === 'therapist') {
        userData.specialty = user.specialty;
        userData.licenseNumber = user.licenseNumber;
        userData.educationBackground = user.educationBackground;
        userData.yearsOfExperience = user.yearsOfExperience;
        userData.bio = user.bio;
        userData.sessionFee = user.sessionFee;
      }

      res.json(userData);
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findByPk(req.user.id);

    console.log('Updating user:', user.id, 'Role:', user.role);

    if (user) {
      // Temel alanları güncelle
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.dateOfBirth = req.body.dateOfBirth || user.dateOfBirth;
      user.gender = req.body.gender || user.gender;
      user.address = req.body.address || user.address;
      user.profilePicture = req.body.profilePicture || user.profilePicture;
      
      // Terapist ise ek alanları güncelle
      if (user.role === 'therapist') {
        console.log('User is therapist. Request sessionFee:', req.body.sessionFee);
        user.specialty = req.body.specialty || user.specialty;
        user.licenseNumber = req.body.licenseNumber || user.licenseNumber;
        user.educationBackground = req.body.educationBackground || user.educationBackground;
        user.yearsOfExperience = req.body.yearsOfExperience || user.yearsOfExperience;
        user.bio = req.body.bio || user.bio;
        user.sessionFee = req.body.sessionFee !== undefined ? req.body.sessionFee : user.sessionFee;
        console.log('Assigned user.sessionFee:', user.sessionFee);
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      console.log('Attempting to save user with data:', user.dataValues);
      await user.save();
      console.log('User save successful.');

      // Yanıt objesini oluştur
      const responseData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        status: user.status,
        message: 'Profil başarıyla güncellendi',
        token: generateToken(user.id), // Token'ı tekrar göndermek genellikle iyi bir pratik DEĞİLDİR, ama mevcut yapı böyle.
      };

      // Eğer kullanıcı terapist ise, yanıta terapist bilgilerini de ekle
      if (user.role === 'therapist') {
        responseData.specialty = user.specialty;
        responseData.licenseNumber = user.licenseNumber;
        responseData.educationBackground = user.educationBackground;
        responseData.yearsOfExperience = user.yearsOfExperience;
        responseData.bio = user.bio;
        responseData.sessionFee = user.sessionFee; // Güncellenmiş sessionFee'yi ekle
      }

      res.json(responseData);
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user by ID (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.status = req.body.status || user.status;
      user.phone = req.body.phone || user.phone;
      
      // Terapist işlemleri için ek alanlar
      if (user.role === 'therapist') {
        user.specialty = req.body.specialty || user.specialty;
        user.licenseNumber = req.body.licenseNumber || user.licenseNumber;
        user.yearsOfExperience = req.body.yearsOfExperience || user.yearsOfExperience;
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      await user.save();

      res.json({
        message: 'Kullanıcı başarıyla güncellendi',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      });
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (user) {
      await user.destroy();
      res.json({ message: 'Kullanıcı silindi' });
    } else {
      res.status(404);
      throw new Error('Kullanıcı bulunamadı');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload user profile picture
// @route   POST /api/users/profile/picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Lütfen bir resim dosyası seçin.');
    }

    // Dosya başarıyla yüklendi, URL'sini oluştur
    // 'public' kısmını URL'den çıkarıyoruz çünkü statik olarak sunulacak
    const profilePictureUrl = `/uploads/profilePictures/${req.file.filename}`;

    console.log(`Profil resmi yüklendi: ${profilePictureUrl}`);

    // Sadece URL'yi döndür, veritabanı güncellemesini PUT /profile yapacak
    res.status(200).json({
      message: 'Profil resmi başarıyla yüklendi.',
      profilePictureUrl: profilePictureUrl
    });

  } catch (error) {
     // Multer dosya filtresi hatasını yakala
    if (error.message === 'Sadece resim dosyaları yüklenebilir!') {
      return res.status(400).json({ message: error.message });
    }
    // Diğer hatalar
    console.error('Profil resmi yüklenirken hata:', error);
    res.status(500).json({ message: 'Profil resmi yüklenirken bir sunucu hatası oluştu.' });
  }
};

module.exports = {
  authUser,
  registerCustomer,
  registerTherapist,
  registerAdmin,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadProfilePicture,
}; 