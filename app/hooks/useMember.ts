import { UsersSchema } from "@/lib/types";
import { useUserData } from "@/providers/UserDataProvider";
import { AdminService } from "@/services/AdminService";
import { useCallback, useMemo } from "react";

function useMember() {
    const { session } = useUserData();
    const adminService = useMemo(() => new AdminService, [])

    const getUsers = useCallback(async (): Promise<any> => {
        if (!session?.access_token) throw new Error("No session");
        const data = await adminService.getUsers(session?.access_token);
        return UsersSchema.parse(data)
    }, [adminService])


    return { getUsers } 
}

export { useMember }