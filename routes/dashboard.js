const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // path to your order model
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const stats = await Order.aggregate([
      {
        $facet: {
          totalOrders: [{ $count: 'count' }],
          totalRevenue: [{ $group: { _id: null, total: { $sum: '$total' } } }],
          totalGST: [{ $group: { _id: null, total: { $sum: '$gst' } } }],
          averageOrderValue: [
            {
              $group: {
                _id: null,
                avg: { $avg: '$total' }
              }
            }
          ],
          statusCounts: [
            {
              $group: {
                _id: '$orderStatus',
                count: { $sum: 1 }
              }
            }
          ],
          paymentStatusCounts: [
            {
              $group: {
                _id: '$paymentStatus',
                count: { $sum: 1 }
              }
            }
          ],
          monthlyRevenue: [
            {
              $match: {
                createdAt: { $gte: sixMonthsAgo }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                revenue: { $sum: '$total' },
                count: { $sum: 1 }
              }
            },
            {
              $sort: {
                '_id.year': 1,
                '_id.month': 1
              }
            }
          ],
          dailyOrders: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id': -1 } }
          ],
          totalDiscounts: [
            {
              $group: {
                _id: null,
                discount: { $sum: '$discount' }
              }
            }
          ],
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantitySold: { $sum: '$items.quantity' }
              }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 5 }
          ]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

module.exports = router;
