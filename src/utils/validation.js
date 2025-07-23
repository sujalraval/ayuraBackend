const Joi = require('joi');

exports.validateOrder = (data) => {
    const schema = Joi.object({
        userId: Joi.string().required(),
        patientInfo: Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            phone: Joi.string().required(),
            dob: Joi.string().allow(''),
            gender: Joi.string().allow(''),
            relation: Joi.string().default('self'),
            address: Joi.string().allow(''),
            city: Joi.string().allow(''),
            state: Joi.string().allow(''),
            pincode: Joi.string().allow(''),
            timeSlot: Joi.string().allow(''),
            memberId: Joi.string().allow('')
        }).required(),
        cartItems: Joi.array().items(
            Joi.object({
                testId: Joi.alternatives().try(
                    Joi.string().required(),
                    Joi.string().hex().length(24).required() // MongoDB ObjectId
                ),
                testName: Joi.string().required(),
                lab: Joi.string().required(),
                price: Joi.number().positive().required()
            })
        ).min(1).required(),
        totalPrice: Joi.number().positive().required(),
        paymentMethod: Joi.string().valid('COD', 'Online', 'Wallet').default('COD')
    });

    return schema.validate(data);
};
