const Joi = require("joi");

const skinSchema = Joi.object({
  skinName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.base": "skinName matn (string) bo'lishi kerak",
      "string.empty": "skinName bo'sh bo'lishi mumkin emas",
      "string.min": "skinName kamida 2 ta belgidan iborat bo'lishi kerak",
      "string.max": "skinName ko'pi bilan 100 ta belgidan oshmasligi kerak",
      "any.required": "skinName maydoni kiritilishi shart",
    }),

  skinRarity: Joi.string()
    .valid("Common", "Rare", "Epic", "Legendary", "Mythic")
    .required()
    .messages({
      "string.base": "skinRarity matn (string) bo'lishi kerak",
      "string.empty": "skinRarity bo'sh bo'lishi mumkin emas",
      "any.only": "skinRarity faqat quyidagilardan biri bo'lishi kerak: 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'",
      "any.required": "skinRarity maydoni kiritilishi shart",
    }),

  skinPrice: Joi.number()
    .positive()
    .min(0.01)
    .required()
    .messages({
      "number.base": "skinPrice raqam (son) bo'lishi kerak",
      "number.positive": "skinPrice musbat son bo'lishi kerak",
      "number.min": "skinPrice narxi kamida 0.01 bo'lishi kerak",
      "any.required": "skinPrice maydoni kiritilishi shart",
    }),
});

const updateSkinSchema = Joi.object({
  skinName: Joi.string()
    .min(2)
    .max(100)
    .messages({
      "string.base": "skinName matn bo'lishi kerak",
      "string.min": "skinName kamida 2 ta belgidan iborat bo'lishi kerak",
      "string.max": "skinName ko'pi bilan 100 ta belgidan oshmasligi kerak",
    }),

  skinRarity: Joi.string()
    .valid("Common", "Rare", "Epic", "Legendary", "Mythic")
    .messages({
      "any.only": "skinRarity faqat quyidagilardan biri bo'lishi kerak: 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'",
    }),

  skinPrice: Joi.number()
    .positive()
    .min(0.01)
    .messages({
      "number.base": "skinPrice raqam bo'lishi kerak",
      "number.positive": "skinPrice musbat son bo'lishi kerak",
      "number.min": "skinPrice narxi kamida 0.01 bo'lishi kerak",
    }),
})
  .min(1)
  .messages({
    "object.min": "Yangilash uchun kamida bitta maydon (skinName, skinRarity yoki skinPrice) yuborilishi kerak",
  });

module.exports = {
  skinSchema,
  updateSkinSchema,
};