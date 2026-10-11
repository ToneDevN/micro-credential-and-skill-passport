const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'instructor'],
        message: 'Role must be either student or instructor',
      },
      required: [true, 'Role is required'],
    },
    github_username: {
      type: String,
      default: null,
    },
    github_access_token: {
      type: String,
      default: null,
    },
    github_connected_status: {
      type: String,
      enum: ['connected', 'not_connected'],
      default: 'not_connected',
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for password to handle plaintext input on create/update
userSchema
  .virtual('password')
  .set(function (value) {
    this._plainPassword = value;
  })
  .get(function () {
    return this._plainPassword;
  });

// Pre-validate / Pre-save hook: hash plaintext password into password_hash
userSchema.pre('validate', async function (next) {
  if (this._plainPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password_hash = await bcrypt.hash(this._plainPassword, salt);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password_hash) return false;
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Exclude password_hash and sensitive tokens from JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password_hash;
  delete obj._plainPassword;
  delete obj.github_access_token;
  return obj;
};


const User = mongoose.model('User', userSchema);

module.exports = User;
