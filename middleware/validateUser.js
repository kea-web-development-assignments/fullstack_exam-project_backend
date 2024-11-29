const fieldRequiredMessage = (fieldLabel) => `${fieldLabel} is required!`;
const fieldInvalidMessage = (fieldLabel) => `${fieldLabel} is invalid!`;

const userFieldsLookup = {
    username: {
        label: 'Username',
        regex: '^[a-zA-Z0-9]{3,20}$',
    },
    firstName: {
        label: 'First name',
        regex: '^[a-zA-Z]{1,30}$',
    },
    lastName: {
        label: 'Last name',
        regex: '^[a-zA-Z]{1,30}$',
    },
    email: {
        label: 'Email',
        regex: '^[^@]+@[^@]+\\.[^@]+$',
    },
    password: {
        label: 'Password',
        regex: '^[^ ]{1,50}$',
    },
};

export default function(
    fields = ['username', 'firstName', 'lastName', 'email', 'password'], //default fields
    required = true,
    includeFieldsWithoutValidation = [],
) {
    return (req, res, next) => {
        const data = req.body;
        fields = [...new Set(fields)]; //remove field duplicates
        fields = fields.filter((field) => userFieldsLookup[field]); //only check fields in the lookup

        const errors = {};

        for (const field of fields) {
            if(data[field] === undefined || data[field] === '' || data[field]?.length === 0 || data[field]?.[0]?.size === 0) {
                if(!required) continue;
                errors[field] = fieldRequiredMessage(userFieldsLookup[field].label);
            }
            else if(userFieldsLookup[field].regex && !(new RegExp(userFieldsLookup[field].regex)).test(data[field])) {
                errors[field] = fieldInvalidMessage(userFieldsLookup[field].label);
            }
        }

        if(Object.values(errors).filter(Boolean).length) { //if there are errors
            return res.status(400).send({
                error: {
                    message: 'User validation failed',
                    fields: errors,
                }
            });
        }

        //only return (non-empty) fields that have been validated or that are in `includeFieldsWithoutValidation`
        req.body = Object.fromEntries(
            Object.entries(data).filter(([ key, value ]) => {
                if(value === undefined || value === '' || value?.length === 0 || value?.[0]?.size === 0) {
                    return false;
                }

                return fields.includes(key) || includeFieldsWithoutValidation.includes(key);
            })
        );
        next();
    };
}
