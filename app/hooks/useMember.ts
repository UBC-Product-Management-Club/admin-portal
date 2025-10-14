import { UserSchema, UsersSchema, type User } from "@/lib/types/User";
import { UserService } from "@/services/UserService";
import { useCallback, useMemo } from "react";

function useMember() {
    const userService = useMemo(() => new UserService, [])

    const getUsers = useCallback(async (): Promise<User[]> => {
        const data = await userService.getUsers();
        return UsersSchema.parse(data)
    }, [userService])

    const getUser = useCallback(async (user_id: string): Promise<User> => {
        const user = await userService.getUser(user_id);
        return UserSchema.parse(user)
    }, [userService])


    return { getUsers, getUser }
}

export { useMember }