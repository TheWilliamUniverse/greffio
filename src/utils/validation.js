export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  return password.length >= 8;
};

export const validateName = (name) => {
  return name.trim().length >= 2;
};

export const getPasswordStrength = (password) => {
  if (password.length === 0) return 0;
  let strength = 0;
  if (password.length > 7) strength += 25;
  if (password.match(/[a-z]+/)) strength += 25;
  if (password.match(/[A-Z]+/)) strength += 25;
  if (password.match(/[0-9]+/) || password.match(/[$@#&!]+/)) strength += 25;
  return strength;
};