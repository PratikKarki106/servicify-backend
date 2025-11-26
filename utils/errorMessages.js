// utils/errorMessages.js

const errorMessages = {
  // ✅ Authentication & Authorization
  USER_EXISTS: "User already exists",
  INVALID_CREDENTIALS: "Invalid email or password",
  UNAUTHORIZED: "You are not authorized to perform this action",
  TOKEN_MISSING: "Authentication token is missing",
  TOKEN_INVALID: "Authentication token is invalid or expired",
  SESSION_EXPIRED: "Your session has expired, please log in again",

  // ✅ Signup & Login
  SIGNUP_FAILED: "Signup failed due tao an unexpected error",
  LOGIN_FAILED: "Login failed due to an unexpected error",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters long",
  PASSWORD_WEAK: "Password must contain uppercase, lowercase, number, and symbol",

  // ✅ Validation
  MISSING_FIELDS: "Please fill in all required fields",
  INVALID_EMAIL: "Email format is invalid",
  INVALID_INPUT: "One or more fields contain invalid data",

  // ✅ Database
  DB_CONNECTION_FAILED: "Failed to connect to the database",
  DB_QUERY_FAILED: "Database query failed",
  USER_NOT_FOUND: "User not found",
  DUPLICATE_KEY: "Duplicate entry detected in database",

  // ✅ Server/System
  SERVER_ERROR: "Something went wrong. Please try again later",
  ROUTE_NOT_FOUND: "Requested route does not exist",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable",

  GOOGLE_ACCOUNT_LOGIN: "This account was created with Google. Please login using Google.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
};

export default errorMessages;