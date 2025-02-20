const Report = require("../models/Report");

// Save report
exports.saveReport = async (req, res) => {
  try {
    const report = await Report.create(req.body);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        success: false,
        message: "You have already reported this contract",
      });
    }

    res.status(400).json({
      success: false,
      message: "Error saving report",
      error: error.message,
    });
  }
};

// Get reports for a contract
exports.getReports = async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reports = await Report.find({ contractAddress })
      .sort({ reportDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Report.countDocuments({ contractAddress });

    res.status(200).json({
      success: true,
      data: reports,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalReports: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: error.message,
    });
  }
};

// Get reports by a reporter
exports.getReportsByReporter = async (req, res) => {
  try {
    const { reporter } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reports = await Report.find({ reporter })
      .sort({ reportDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Report.countDocuments({ reporter });

    res.status(200).json({
      success: true,
      data: reports,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalReports: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: error.message,
    });
  }
};

// Get threat statistics for a contract
exports.getThreatStats = async (req, res) => {
  try {
    const { contractAddress } = req.params;

    const stats = await Report.aggregate([
      { $match: { contractAddress } },
      { $unwind: "$threats" },
      {
        $group: {
          _id: "$threats",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          threat: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching threat statistics",
      error: error.message,
    });
  }
};

// Get popular threat types
exports.getPopularThreatTypes = async (req, res) => {
  try {
    const stats = await Report.aggregate([
      { $unwind: "$threats" },
      {
        $group: {
          _id: "$threats",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          threat: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching threat statistics",
      error: error.message,
    });
  }
};

// Get most reported contracts
exports.getMostReportedContracts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const stats = await Report.aggregate([
      {
        $group: {
          _id: "$contractAddress",
          reportCount: { $sum: 1 },
          uniqueReporters: { $addToSet: "$reporter" },
          threats: { $push: "$threats" },
          lastReportDate: { $max: "$reportDate" },
        },
      },
      {
        $project: {
          contractAddress: "$_id",
          reportCount: 1,
          uniqueReporterCount: { $size: "$uniqueReporters" },
          uniqueThreats: {
            $reduce: {
              input: "$threats",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
          lastReportDate: 1,
          _id: 0,
        },
      },
      { $sort: { reportCount: -1, lastReportDate: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching most reported contracts",
      error: error.message,
    });
  }
};
