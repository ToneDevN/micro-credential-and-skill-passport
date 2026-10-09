const mongoose = require('mongoose');

const microSkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Skill description is required'],
      trim: true,
    },
    criteria: {
      type: String,
      required: [true, 'Skill verification criteria is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const MicroSkill = mongoose.model('MicroSkill', microSkillSchema);

module.exports = MicroSkill;
