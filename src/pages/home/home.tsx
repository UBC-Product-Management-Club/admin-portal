import { useList } from "@refinedev/core"

export default function Home() {

    const { data } = useList({
        resource: "users"
    })

    return <h1>Total members: { data?.total }</h1>
}