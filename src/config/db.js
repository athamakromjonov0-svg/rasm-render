const mongoose = require('mongoose')
const autoSeed = require('../seeders/autoSeed')

// MongoDB ulanishi: xato bo'lsa serverni o'ldirmaymiz (process.exit yo'q),
// chunki Render'da env o'zgaruvchi unutilsa ham deploy "Exited with status 1"
// bo'lib yiqilmasin — server turib, DB ishlamasa aniq xabar beradi.
//
// serverSelectionTimeoutMS: Mongoose soyasi uzun "buffering timed out"
// xatolari oldini oladi — ulanish 30 soniyada aniq xato sifatida chiqadi.
const DEFAULT_OPTS = {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
}

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

    // Aniq diagnostika: uri kelyotganini ko'rsatamiz (parol qismini maskalaymiz)
    const masked = uri.replace(/\/\/[^@]+@/, '//***@')
    console.log(`MongoDB'ga ulanish urinishi ${attempt}: ${masked}`)

    try {
        await mongoose.connect(uri, DEFAULT_OPTS)
        console.log('Connected to MongoDB')

        // Ulanish muvaffaqiyatli — katalog bo'sh bo'lsa skinlar qo'shiladi
        autoSeed()
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
