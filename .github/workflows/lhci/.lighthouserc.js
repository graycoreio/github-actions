const domain = process.env.LIGHTHOUSE_DOMAIN;

module.exports = {
    ci: {
        assert: {
            assertions: {
                "dom-size": ["error", { "maxNumericValue": 3000 }],
            },
        },
        collect: {
            url: [
                domain + "/"
            ]
        }
    },
};