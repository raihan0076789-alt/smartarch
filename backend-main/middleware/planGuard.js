// middleware/planGuard.js
// Usage: router.get('/route', auth, planGuard('pro'), handler)

const PLAN_HIERARCHY = { free: 0, pro: 1, enterprise: 2 };

const PLAN_LIMITS = {
    free:       { projects: 3,  aiMessages: 10,  exports: [],                      multiFloor: false, viz3d: false },
    pro:        { projects: 20, aiMessages: 500, exports: ['obj', 'stl', 'gltf'],  multiFloor: true,  viz3d: true  },
    enterprise: { projects: Infinity, aiMessages: Infinity, exports: ['obj', 'stl', 'gltf', 'cad'], multiFloor: true, viz3d: true }
};

/**
 * planGuard(requiredPlan)
 * Blocks the route if user's active plan is below the required level.
 * Attach AFTER the auth middleware so req.user is populated.
 */
const planGuard = (requiredPlan) => (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const userPlan   = user.plan || 'free';
    const userLevel  = PLAN_HIERARCHY[userPlan]  ?? 0;
    const reqLevel   = PLAN_HIERARCHY[requiredPlan] ?? 0;

    // Check plan expiry for paid plans
    if (userPlan !== 'free' && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        return res.status(403).json({
            success: false,
            code: 'PLAN_EXPIRED',
            message: 'Your subscription has expired. Please renew to continue.',
            currentPlan: userPlan,
            requiredPlan
        });
    }

    if (userLevel < reqLevel) {
        return res.status(403).json({
            success: false,
            code: 'PLAN_REQUIRED',
            message: `This feature requires the ${requiredPlan} plan or above.`,
            currentPlan: userPlan,
            requiredPlan
        });
    }

    next();
};

/**
 * projectLimitGuard
 * Checks if user has reached their project limit before creating a new one.
 * Requires req.user and a count of existing projects passed as req.projectCount.
 */
const projectLimitGuard = async (req, res, next) => {
    try {
        const Project = require('../models/Project');
        const plan    = req.user.plan || 'free';
        const limit   = PLAN_LIMITS[plan]?.projects ?? 3;

        if (limit === Infinity) return next();

        const count = await Project.countDocuments({ user: req.user._id });
        if (count >= limit) {
            return res.status(403).json({
                success: false,
                code: 'PROJECT_LIMIT_REACHED',
                message: `Your ${plan} plan allows up to ${limit} project${limit === 1 ? '' : 's'}. Upgrade to create more.`,
                limit,
                currentPlan: plan
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * aiMessageGuard
 * Checks + increments AI message usage. Resets counter monthly.
 */
const aiMessageGuard = async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user._id);
        const plan  = user.plan || 'free';
        const limit = PLAN_LIMITS[plan]?.aiMessages ?? 10;

        if (limit === Infinity) return next();

        // Reset counter if it's a new month
        const now       = new Date();
        const resetAt   = user.aiMessagesResetAt ? new Date(user.aiMessagesResetAt) : null;
        const needReset = !resetAt || now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear();

        if (needReset) {
            user.aiMessagesUsed    = 0;
            user.aiMessagesResetAt = now;
        }

        if (user.aiMessagesUsed >= limit) {
            return res.status(403).json({
                success: false,
                code: 'AI_LIMIT_REACHED',
                message: `You've used all ${limit} AI messages for this month. Upgrade for more.`,
                limit,
                used: user.aiMessagesUsed,
                currentPlan: plan
            });
        }

        user.aiMessagesUsed += 1;
        await user.save();
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { planGuard, projectLimitGuard, aiMessageGuard, PLAN_LIMITS };