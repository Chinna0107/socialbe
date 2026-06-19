# Authentication System Documentation

## Overview
The social news platform supports three types of authentication:
1. **Admin Login** - For administrators to access admin panel
2. **Student Login** - For students to access student dashboard  
3. **User Login** - For general users (civic leaders, volunteers, etc.)

## Authentication Endpoints

### 1. Admin Login
**Endpoint:** `POST /api/auth/admin-login`

**Purpose:** Authenticate administrators to access admin panel

**Request Body:**
```json
{
  "email": "admin@socialnews.org",
  "password": "Admin@social123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": 1,
    "name": "Super Admin",
    "email": "admin@socialnews.org",
    "role": "admin"
  }
}
```

**Default Admin Credentials:**
- Email: `admin@socialnews.org`
- Password: `Admin@social123`

### 2. User Registration
**Endpoint:** `POST /api/auth/register`

**Purpose:** Register new students/users

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "phone": "1234567890",
  "role": "student"  // or "user", "civic_leader", "volunteer"
}
```

**Success Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "student_id": "SN-ABC123",
    "impact_points": 0
  }
}
```

### 3. User/Student Login
**Endpoint:** `POST /api/auth/login`

**Purpose:** Authenticate students and users

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "student_id": "SN-ABC123",
    "impact_points": 100,
    "avatar": null
  }
}
```

## User Roles & Access

### Role Types:
- **admin** - Full system access (admin panel)
- **student** - Student dashboard and learning features
- **user** - General user access
- **civic_leader** - Community leadership features
- **volunteer** - Volunteer-specific features
- **moderator** - Content moderation access

### Access Control:
- **Admin Routes** (`/api/admin/*`) - Requires `admin` role
- **Student/User Routes** (`/api/student/*`) - Requires any non-admin role
- **Public Routes** - No authentication required

## Authentication Middleware

### authAdmin
- Validates JWT token
- Requires `admin` role
- Sets `req.admin` and `req.user`

### authUser  
- Validates JWT token
- Requires non-admin roles: `student`, `user`, `civic_leader`, `moderator`, `volunteer`
- Sets `req.user`

### authAny
- Validates JWT token
- Allows any authenticated user
- Sets `req.user`

## Token Usage

Include the JWT token in API requests:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

**Token Properties:**
- Expiration: 7 days
- Algorithm: HS256
- Includes: `id`, `email`, `role`

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Name, email and password required"
}
```

### 401 - Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 403 - Forbidden
```json
{
  "error": "Admin access required"
}
```

### 409 - Conflict
```json
{
  "error": "Email already registered"
}
```

## Testing Authentication

### 1. Start the Server
```bash
cd /Users/hemanthkancharla/socialnewsbe
npm start
```

### 2. Run Authentication Tests
```bash
node test-login.js
```

### 3. Manual Testing with curl

**Admin Login:**
```bash
curl -X POST http://localhost:5000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialnews.org","password":"Admin@social123"}'
```

**User Registration:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@example.com","password":"Test123","role":"student"}'
```

**User Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'
```

**Access Protected Route:**
```bash
curl -X GET http://localhost:5000/api/student/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Frontend Integration

### Login Flow Example (React):
```javascript
// Admin Login
const adminLogin = async (email, password) => {
  const response = await fetch('/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('adminToken', data.token);
    // Redirect to admin dashboard
  }
};

// Student/User Login
const userLogin = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('userToken', data.token);
    // Redirect to user dashboard
  }
};

// API calls with authentication
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
  return fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
};
```

## Security Features

- **Password Hashing:** bcryptjs with 10 salt rounds
- **JWT Security:** Signed tokens with expiration
- **Role-based Access:** Strict role validation
- **Input Validation:** Required field checking
- **SQL Injection Prevention:** Parameterized queries
- **Activity Logging:** User login tracking

## Database Setup

The authentication system requires these tables:
- `admins` - Admin accounts
- `users` - User/student accounts  
- `activity_logs` - Login/activity tracking

Run setup to create tables and seed admin:
```bash
npm run setup
```