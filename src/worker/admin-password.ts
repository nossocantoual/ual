// Simple password storage using environment variable or default
let adminPassword = '01530153';

export function setAdminPassword(newPassword: string) {
  adminPassword = newPassword;
}

export function checkAdminPassword(password: string): boolean {
  return password === adminPassword;
}

export function getAdminPassword(): string {
  return adminPassword;
}
