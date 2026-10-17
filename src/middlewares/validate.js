const validate = (schema) => {
  return (req, res, next) => {
    // Agar body umuman yuborilmagan yoki bo'sh bo'lsa
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Yuborilgan ma'lumotda xatolik mavjud",
        errors: [
          {
            field: "body",
            error: "So'rov tanasi (body) bo'sh bo'lishi mumkin emas. JSON formatida ma'lumot yuboring.",
          },
        ],
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Yuborilgan ma'lumotda xatolik mavjud",
        errors: error.details.map((detail) => ({
          field: detail.path.join('.'),
          error: detail.message.replace(/['"]/g, ''),
        })),
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
