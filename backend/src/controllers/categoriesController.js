const categoryModel = require('../models/categoryModel')

exports.getCategories = async (_req, res) => {
  try {
    const categories = await categoryModel.listAll()
    return res.json({
      success: true,
      data: categories.map(category => ({
        id: category.id,
        name: category.name,
        pricePerKg: Number(category.price_per_kg),
      })),
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      success: false,
      error: 'Database error',
    })
  }
}
