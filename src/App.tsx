import {
    Authenticated,
    AuthProvider,
    Refine,
} from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
    ErrorComponent,
    RefineSnackbarProvider,
    ThemedLayoutV2,
    useNotificationProvider,
} from "@refinedev/mui";

import { useAuth0 } from "@auth0/auth0-react";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import routerBindings, {
    CatchAllNavigate,
    DocumentTitleHandler,
    NavigateToResource,
    UnsavedChangesNotifier,
} from "@refinedev/react-router";
import dataProvider, { axiosInstance } from "@refinedev/simple-rest";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import {
    // BlogPostEdit,
    MembersList,
    ShowUser,
} from "./pages/members";
// import {
//     CategoryCreate,
//     CategoryEdit,
//     CategoryList,
//     CategoryShow,
// } from "./pages/events";
import { Login } from "./pages/login";
import Home from "./pages/home/home";

function App() {
    const { isLoading, user, logout, getIdTokenClaims } = useAuth0();

    if (isLoading) {
        return <span>loading...</span>;
    }

    const authProvider: AuthProvider = {
        login: async () => {
            return {
                success: true,
            };
        },
        logout: async () => {
            logout({ returnTo: window.location.origin });
            return {
                success: true,
            };
        },
        onError: async (error) => {
            console.error(error);
            return { error };
        },
        check: async () => {
            try {
                const access_token = await getIdTokenClaims();
                if (access_token) {
                    axiosInstance.defaults.headers["Authorization"] = `Bearer ${access_token}`;
                    return {
                        authenticated: true,
                    };
                } else {
                    return {
                        authenticated: false,
                        error: {
                            message: "Check failed",
                            name: "Token not found",
                        },
                        redirectTo: "/login",
                        logout: true,
                    };
                }
            } catch (error: any) {
                return {
                    authenticated: false,
                    error: new Error(error),
                    redirectTo: "/login",
                    logout: true,
                };
            }
        },
        getPermissions: async () => null,
        getIdentity: async () => {
            if (user) {
                return {
                    ...user,
                    avatar: user.picture,
                };
            }
            return null;
        },
    };

    return (
        <BrowserRouter>
            <RefineKbarProvider>
                <ColorModeContextProvider>
                    <CssBaseline />
                    <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
                    <RefineSnackbarProvider>
                        <DevtoolsProvider>
                            <Refine
                                dataProvider={dataProvider(import.meta.env.VITE_API_URL)}
                                notificationProvider={useNotificationProvider}
                                authProvider={authProvider}
                                routerProvider={routerBindings}
                                resources={[
                                    {
                                        name: "users",
                                        list: "/users",
                                        show: "/users/:id",
                                    },
                                    {
                                        name: "events",
                                        create: "/event/create",
                                        list: "/events",
                                        show: "/events/:id",
                                        edit: "/events/:id",
                                        meta: {
                                            canDelete: true
                                        }
                                    }
                                ]}
                                options={{
                                    syncWithLocation: true,
                                    warnWhenUnsavedChanges: true,
                                    useNewQueryKeys: true,
                                    projectId: "8hXfwR-bhUyEF-HhXDVo",
                                    title: { text: "PMC Admin Portal"},
                                }}
                            >
                                <Routes>
                                    <Route
                                        element={
                                            <Authenticated
                                                key="authenticated-inner"
                                                fallback={<CatchAllNavigate to="/login" />}
                                            >
                                                <ThemedLayoutV2 Header={Header}>
                                                    <Outlet />
                                                </ThemedLayoutV2>
                                            </Authenticated>
                                        }
                                    >
                                        <Route
                                            index
                                            path="/"
                                            element={<Home />}
                                        />
                                        <Route path="/users">
                                            <Route index element={<MembersList />} />
                                            <Route path="/users/:id" element={<ShowUser />} />
                                        </Route>
                                        <Route path="*" element={<ErrorComponent />} />
                                    </Route>
                                    <Route
                                        element={
                                            <Authenticated
                                                key="authenticated-outer"
                                                fallback={<Outlet />}
                                            >
                                                <NavigateToResource />
                                            </Authenticated>
                                        }
                                    >
                                        <Route path="/login" element={<Login />} />
                                    </Route>
                                </Routes>

                                <RefineKbar />
                                <UnsavedChangesNotifier />
                                <DocumentTitleHandler />
                            </Refine>
                            <DevtoolsPanel />
                        </DevtoolsProvider>
                    </RefineSnackbarProvider>
                </ColorModeContextProvider>
            </RefineKbarProvider>
        </BrowserRouter>
    );
}

export default App;
