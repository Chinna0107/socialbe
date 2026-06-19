#!/usr/bin/env node

// Simple Login Test Script
// Run this after starting the server with: node test-login.js

const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            success: false
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLogin() {
  console.log('🚀 Testing Authentication System');
  console.log('================================\\n');

  // Test 1: Admin Login
  console.log('1. Testing Admin Login...');
  try {
    const adminResult = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'admin@socialnews.org',
      password: 'Admin@social123'
    });
    
    if (adminResult.success) {
      console.log('✅ Admin login successful');
      console.log('   Admin:', adminResult.data.admin?.name);
      console.log('   Token length:', adminResult.data.token?.length || 0);
    } else {
      console.log('❌ Admin login failed:', adminResult.data.error || adminResult.data);
    }
  } catch (error) {
    console.log('❌ Admin login error:', error.message);
  }

  console.log('\\n2. Testing User Registration...');
  try {
    const registerResult = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      name: 'Test Student',
      email: 'teststudent@example.com',
      password: 'TestPassword123',
      role: 'student'
    });
    
    if (registerResult.success) {
      console.log('✅ Student registration successful');
      console.log('   Student:', registerResult.data.user?.name);
      console.log('   Student ID:', registerResult.data.user?.student_id);
      console.log('   Token length:', registerResult.data.token?.length || 0);
    } else {
      console.log('❌ Student registration failed:', registerResult.data.error || registerResult.data);
    }
  } catch (error) {
    console.log('❌ Registration error:', error.message);
  }

  console.log('\\n3. Testing User Login...');
  try {
    const loginResult = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'teststudent@example.com',
      password: 'TestPassword123'
    });
    
    if (loginResult.success) {
      console.log('✅ User login successful');
      console.log('   User:', loginResult.data.user?.name);
      console.log('   Role:', loginResult.data.user?.role);
      console.log('   Token length:', loginResult.data.token?.length || 0);
      
      // Test protected route
      console.log('\\n4. Testing Protected Route Access...');
      const protectedResult = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/student/dashboard',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginResult.data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (protectedResult.success) {
        console.log('✅ Protected route access successful');
        console.log('   Dashboard data received:', Object.keys(protectedResult.data));
      } else {
        console.log('❌ Protected route access failed:', protectedResult.data.error || protectedResult.data);
      }
    } else {
      console.log('❌ User login failed:', loginResult.data.error || loginResult.data);
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
  }

  console.log('\\n================================');
  console.log('🏁 Authentication Test Complete');
}

// Run the test
testLogin().catch(console.error);