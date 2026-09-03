export const ROLE_HOME = {
  admin: '/admin',
  officer: '/officer',
  head: '/officer',
  citizen: '/dashboard',
};

export function getHomeForRole(role) {
  return ROLE_HOME[role] || '/dashboard';
}
