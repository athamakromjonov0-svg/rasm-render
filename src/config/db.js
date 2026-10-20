const mongoose = require('mongoose')

// MongoDB ulanishi: xato bo'lsa serverni o'ldirmaymiz (process.exit yo'q),
// chunki Render'da env o'zgaruvchi unutilsa ham deploy "Exited with status 1"
// bo'lib yiqilmasin — server turib, DB ishlamasa aniq xabar beradi.
const connectDB = async (attempt = 1) => {
    const uri = process.env.MONGODB_URI

    if (!uri) {
        console.error(
            "XATO: MONGODB_URI berilmadi. Render → Environment da qo'shing.\n" +
            "Server ishlab turadi, lekin DB so'rovlari ishlamaydi. 30 sekunddan keyin qayta urinamiz..."
        )
        setTimeout(() => connectDB(attempt + 1), 30_000)
        return
    }

    try {
        await mongoose.connect(uri)
        console.log('Connected to MongoDB')
    } catch (error) {
        console.error(
            `Error connecting to MongoDB (urinish ${attempt}):`, error.message
        )
        // 5 sekunddan keyin qayta urinamiz — Atlas IP whitelist yoki tarmoq
        // vaqtincha uzilgan bo'lishi mumkin.
        setTimeout(() => connectDB(attempt + 1), 5_000)
    }
}

module.exports = connectDB
