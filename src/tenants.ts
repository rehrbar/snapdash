export type Tenant = {
    hosts: string[],
    name: string,
    color: string
}

const tenants: Tenant[] = [
    {
        hosts: [
            "localhost",
            "demo.lvh.me"
        ],
        name: "demo",
        color: "#07b379ff"
    },
    {
        hosts: [
            "explorer.lvh.me"
        ],
        name: "The explorer",
        color: "#0743b3ff"
    },

]

export default tenants;