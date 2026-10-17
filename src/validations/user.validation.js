const Joi = require("joi");

// POST /api/users — yaratish (role va wallet bu yerdan o'tkazilmaydi:
// stripUnknown ularni olib tashlaydi, model defaultlari ishlaydi)
const createUserSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.min": "username kamida 3 ta belgidan iborat bo'lishi kerak",
      "string.max": "username ko'pi bilan 30 ta belgidan oshmasligi kerak",
      "any.required": "username maydoni kiritilishi shart",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "email noto'g'ri formatda (misol: user@example.com)",
      "any.required": "email maydoni kiritilishi shart",
    }),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      "string.min": "password kamida 6 ta belgidan iborat bo'lishi kerak",
      "any.required": "password maydoni kiritilishi shart",
    }),
});

// PATCH /api/users/:id — faqat ruxsat etilgan maydonlar:
// username, email, password.
// role, wallet, isBanned, skins — alohida boshqariladi (stripUnknown olib tashlaydi).
const updateUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).messages({
    "string.min": "username kamida 3 ta belgidan iborat bo'lishi kerak",
    "string.max": "username ko'pi bilan 30 ta belgidan oshmasligi kerak",
  }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .messages({
      "string.email": "email noto'g'ri formatda (misol: user@example.com)",
    }),

  password: Joi.string().min(6).max(100).messages({
    "string.min": "password kamida 6 ta belgidan iborat bo'lishi kerak",
  }),
})
  .min(1)
  .messages({
    "object.min":
      "Yangilash uchun kamida bitta maydon (username, email yoki password) yuborilishi kerak",
  });

module.exports = {
  createUserSchema,
  updateUserSchema,
};
