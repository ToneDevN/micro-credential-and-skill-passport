const mongoose = require('mongoose');
const { VerificationRequest } = require('../models');
const { getRepoDetails } = require('../services/githubService');

/**
 * @desc    Get GitHub repository info for a verification request's evidence URL
 * @route   GET /api/verification-requests/:id/github-info or /api/v1/verification-requests/:id/github-info
 * @access  Private (Instructor only)
 */
const getGithubInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const verificationRequest = await VerificationRequest.findById(id);
    if (!verificationRequest) {
      return res.status(404).json({ message: 'Verification request not found' });
    }

    const info = await getRepoDetails(verificationRequest.evidence_url);

    return res.status(200).json(info);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGithubInfo,
};
