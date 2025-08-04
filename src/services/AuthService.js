import { jwtDecode } from 'jwt-decode';
const API_BASE_URL = 'http://localhost:8080';
const TOKEN_KEY = 'accessToken';
class AuthService {
// Authentication Methods
async register(userData) {
try {
const response = await fetch(`${API_BASE_URL}/auth/register`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
 },
body: JSON.stringify(userData),
 });
if (!response.ok) {
const errorData = await response.json();
throw new Error(errorData.message || 'Registration failed');
 }
return await response.json();
 } catch (error) {
throw new Error(error.message || 'Network error during registration');
 }
 }
async login(credentials) {
try {
const response = await fetch(`${API_BASE_URL}/auth/login`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
 },
body: JSON.stringify(credentials),
 });
if (!response.ok) {
const errorData = await response.json();
throw new Error(errorData.message || 'Login failed');
 }
return await response.json();
 } catch (error) {
throw new Error(error.message || 'Network error during login');
 }
 }
// Token Management
setToken(token) {
if (!token) return;
localStorage.setItem(TOKEN_KEY, token);
 }
getToken() {
return localStorage.getItem(TOKEN_KEY);
 }
removeToken() {
localStorage.removeItem(TOKEN_KEY);
 }
// JWT Token Parsing
decodeToken(token = null) {
try {
const tokenToUse = token || this.getToken();
if (!tokenToUse) return null;
return jwtDecode(tokenToUse);
 } catch (error) {
console.error('Error decoding token:', error);
return null;
 }
 }
// User Information
getCurrentUser() {
const decoded = this.decodeToken();
if (!decoded) return null;
return {
userId: decoded.userId,
username: decoded.sub,
email: decoded.sub, // Use sub as email
 };
 }
getCurrentUserId() {
const user = this.getCurrentUser();
return user ? user.userId : null;
 }
// Authentication Check
isAuthenticated() {
const token = this.getToken();
if (!token) return false;
try {
const decoded = this.decodeToken(token);
if (!decoded) return false;
const currentTime = Date.now() / 1000;
return decoded.exp > currentTime;
 } catch (error) {
return false;
 }
 }
// Authorization Helper
isCurrentUserCreator(createdById) {
const currentUserId = this.getCurrentUserId();
return currentUserId && currentUserId === createdById;
 }

// New method to check if current user is project owner
isCurrentUserProjectOwner(projectOwnerId) {
const currentUserId = this.getCurrentUserId();
return currentUserId && currentUserId === projectOwnerId;
 }

// New method to check if current user can assign issues
canAssignIssue(issue) {
const currentUserId = this.getCurrentUserId();
if (!currentUserId) return false;
// Can assign if user is:
// 1. Issue creator
// 2. Project owner
return (
this.isCurrentUserCreator(issue.createdById) ||
this.isCurrentUserProjectOwner(issue.projectOwnerId)
 );
 }

// New method to check if current user can update issue status
canUpdateIssueStatus(issue) {
const currentUserId = this.getCurrentUserId();
if (!currentUserId) return false;
// Can update status if user is:
// 1. Assignee
// 2. Issue creator
// 3. Project owner
return (
 (issue.assignee && issue.assignee.id === currentUserId) ||
this.isCurrentUserCreator(issue.createdById) ||
this.isCurrentUserProjectOwner(issue.projectOwnerId)
 );
 }

// Logout
logout() {
this.removeToken();
 }
}
export default new AuthService();