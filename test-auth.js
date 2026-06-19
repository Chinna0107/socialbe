const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testUsers = {
  admin: {
    email: 'admin@socialnews.org',
    password: 'Admin@social123'
  },
  student: {
    name: 'Test Student',
    email: 'student@test.com',
    password: 'Student123',
    role: 'student'
  },
  user: {
    name: 'Test User',
    email: 'user@test.com',
    password: 'User123',
    role: 'user'
  }
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };
    
    if (data) config.data = data;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

// Test functions
async function testAdminLogin() {
  console.log('\\n🔐 Testing Admin Login...');
  
  const result = await apiCall('POST', '/auth/admin-login', {
    email: testUsers.admin.email,
    password: testUsers.admin.password
  });
  
  if (result.success) {
    console.log('✅ Admin login successful');
    console.log('   Token received:', result.data.token ? 'YES' : 'NO');
    console.log('   Admin data:', result.data.admin);
    return result.data.token;
  } else {
    console.log('❌ Admin login failed:', result.error);
    return null;
  }
}

async function testUserRegistration(userType) {
  console.log(`\\n📝 Testing ${userType} Registration...`);
  
  const userData = testUsers[userType];
  const result = await apiCall('POST', '/auth/register', userData);
  
  if (result.success) {
    console.log(`✅ ${userType} registration successful`);
    console.log('   Token received:', result.data.token ? 'YES' : 'NO');
    console.log('   User data:', result.data.user);
    return result.data.token;
  } else {
    console.log(`❌ ${userType} registration failed:`, result.error);
    return null;
  }
}

async function testUserLogin(userType) {
  console.log(`\\n🔐 Testing ${userType} Login...`);
  
  const userData = testUsers[userType];
  const result = await apiCall('POST', '/auth/login', {
    email: userData.email,
    password: userData.password
  });
  
  if (result.success) {
    console.log(`✅ ${userType} login successful`);
    console.log('   Token received:', result.data.token ? 'YES' : 'NO');
    console.log('   User data:', result.data.user);
    return result.data.token;
  } else {
    console.log(`❌ ${userType} login failed:`, result.error);
    return null;
  }
}

async function testProtectedRoute(token, userType, endpoint) {
  console.log(`\\n🛡️  Testing ${userType} access to ${endpoint}...`);
  
  const result = await apiCall('GET', endpoint, null, token);
  
  if (result.success) {
    console.log(`✅ ${userType} can access ${endpoint}`);
    console.log('   Response:', JSON.stringify(result.data, null, 2));
  } else {
    console.log(`❌ ${userType} cannot access ${endpoint}:`, result.error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Authentication Tests...');
  console.log('=====================================');
  
  // Test Admin Login
  const adminToken = await testAdminLogin();
  
  // Test User Registration and Login
  const studentToken = await testUserRegistration('student');
  const userToken = await testUserRegistration('user');
  
  // Test User Login (after registration)
  const studentLoginToken = await testUserLogin('student');
  const userLoginToken = await testUserLogin('user');
  
  // Test Protected Routes
  if (adminToken) {
    await testProtectedRoute(adminToken, 'Admin', '/admin/dashboard');
    await testProtectedRoute(adminToken, 'Admin', '/admin/users');
  }
  
  if (studentLoginToken) {
    await testProtectedRoute(studentLoginToken, 'Student', '/student/dashboard');
    await testProtectedRoute(studentLoginToken, 'Student', '/student/campaigns');
  }
  
  if (userLoginToken) {
    await testProtectedRoute(userLoginToken, 'User', '/student/dashboard');
    await testProtectedRoute(userLoginToken, 'User', '/student/profile');
  }
  
  // Test Cross-Access (should fail)
  if (studentLoginToken) {
    await testProtectedRoute(studentLoginToken, 'Student', '/admin/dashboard');
  }
  
  console.log('\\n=====================================');
  console.log('🏁 Authentication Tests Complete');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testAdminLogin, testUserRegistration, testUserLogin };