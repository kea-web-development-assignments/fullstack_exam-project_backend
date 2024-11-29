const fieldRequiredMessage = (fieldLabel) => `${fieldLabel} is required!`;
const fieldInvalidMessage = (fieldLabel) => `${fieldLabel} is invalid!`;

const gameFieldsLookup = {
    name: {
        label: 'Name',
        regex: '^[a-zA-Z0-9 -:()]{1,100}$',
    },
    slug: {
        label: 'Slug',
        regex: '^[a-zA-Z0-9-]{1,100}$',
    },
    description: {
        label: 'Description',
        regex: '^.{1,500}$',
    },
    releaseDate: {
        label: 'Release Date',
    },
    image: {
        label: 'Image',
        regex: '^https?://.+$',
    },
    screenshots: {
        label: 'Screenshots',
        validationFunction: (screenshots) => screenshots.every(url => /^https?:\/\/.+$/.test(url)),
    },
    tags: {
        label: 'Tags',
        validationFunction: (tags) => tags.every(tag => /^[a-zA-Z0-9 -]{1,100}$/.test(tag.name)),
    },
    platforms: {
        label: 'Platforms',
        validationFunction: (platforms) => platforms.every(platform => /^[a-zA-Z0-9 -:()]{1,100}$/.test(platform.name)),
    },
};

export default function(
    fields = ['name', 'slug', 'description', 'releaseDate', 'image', 'screenshots', 'tags', 'platforms'],
    required = true,
    includeFieldsWithoutValidation = [],
) {
    return (req, res, next) => {
        const data = req.body;
        fields = [...new Set(fields)];
        fields = fields.filter((field) => gameFieldsLookup[field]);

        const errors = {};

        for (const field of fields) {
            if(data[field] === undefined || data[field] === '' || data[field]?.length === 0 || data[field]?.[0]?.size === 0) {
                if(!required) continue;
                errors[field] = fieldRequiredMessage(gameFieldsLookup[field].label);
            }
            else if(field === 'releaseDate' && isNaN(Date.parse(data[field]))) {
                errors[field] = fieldInvalidMessage(gameFieldsLookup[field].label);
            }
            else if(gameFieldsLookup[field].regex && !(new RegExp(gameFieldsLookup[field].regex)).test(data[field])) {
                errors[field] = fieldInvalidMessage(gameFieldsLookup[field].label);
            }
            else if(gameFieldsLookup[field].validate && !gameFieldsLookup[field].validationFunction(data[field])) {
                errors[field] = fieldInvalidMessage(gameFieldsLookup[field].label);
            }
        }

        if(Object.values(errors).filter(Boolean).length) {
            return res.status(400).send({
                error: {
                    message: 'Game validation failed',
                    fields: errors,
                }
            });
        }

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
