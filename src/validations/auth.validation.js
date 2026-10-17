const Joi = require("joi");

// POST /api/auth/register
const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.base": "username matn (string) bo'lishi kerak",
      "string.empty": "username bo'sh bo'lishi mumkin emas",
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
      "string.base": "email matn (string) bo'lishi kerak",
      "string.empty": "email bo'sh bo'lishi mumkin emas",
      "string.email": "email noto'g'ri formatda (misol: user@example.com)",
      "any.required": "email maydoni kiritilishi shart",
    }),

  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      "string.base": "password matn (string) bo'lishi kerak",
      "string.empty": "password bo'sh bo'lishi mumkin emas",
      "string.min": "password kamida 6 ta belgidan iborat bo'lishi kerak",
      "string.max": "password ko'pi bilan 100 ta belgidan oshmasligi kerak",
      "any.required": "password maydoni kiritilishi shart",
    }),
});

// POST /api/auth/login
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "email bo'sh bo'lishi mumkin emas",
      "string.email": "email noto'g'ri formatda",
      "any.required": "email maydoni kiritilishi shart",
    }),

  password: Joi.string()
    .required()
    .messages({
      "string.empty": "password bo'sh bo'lishi mumkin emas",
      "any.required": "password maydoni kiritilishi shart",
    }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
