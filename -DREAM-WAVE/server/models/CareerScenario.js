const mongoose = require('mongoose')

const careerScenarioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'What-if scenario' },
    targetRole: { type: String, required: true },
    simulation: { type: mongoose.Schema.Types.Mixed, default: {} },
    isSimulation: { type: Boolean, default: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 86400000) },
  },
  { timestamps: true },
)

careerScenarioSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('CareerScenario', careerScenarioSchema)
