export function requireLogin() {
  const email = localStorage.getItem('studentEmail');
  const name = localStorage.getItem('studentName');

  if (!email) {
    window.location.href = 'login.html';
    return null;
  }

  return { email, name };
}

export function requireAdmin(adminEmail) {
  const user = requireLogin();
  if (!user) return null;

  if (user.email !== adminEmail) {
    alert('Access denied.');
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}