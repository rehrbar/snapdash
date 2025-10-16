export type Tenant = {
    hosts: string[],
    name: string,
    color: string,
    folder: string
}

const tenants: Tenant[] = [
    {
        hosts: [
            "localhost",
            "demo.lvh.me"
        ],
        name: "demo",
        color: "#07b379ff",
        folder: "demo"
    },
    {
        hosts: [
            "explorer.lvh.me"
        ],
        name: "The explorer",
        color: "#0743b3ff",
        folder: "the-explorer"
    },

]

export default tenants;