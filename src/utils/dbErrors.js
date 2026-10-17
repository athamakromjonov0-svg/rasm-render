// MongoDB dublikat indeksi xatosini (E11000) aniqlash.
// unique: true indeks yaratadi — xato validatsiyadan emas, DBdan keladi.
const isDuplicateKeyError = (err) => Boolean(err) && err.code === 11000;

// Qaysi maydon dublikat bo'lganini aniqlash.
// keyPattern: { email: 1 } -> "email"
const getDuplicateField = (err) => {
  if (!isDuplicateKeyError(err)) return null;
  if (err.keyPattern && Object.keys(err.keyPattern).length > 0) {
    return Object.keys(err.keyPattern)[0];
  }
  if (err.message && /index: (\w+)_/.test(err.message)) {
    return err.message.match(/index: (\w+)_/)[1];
  }
  return null;
};

module.exports = { isDuplicateKeyError, getDuplicateField };
