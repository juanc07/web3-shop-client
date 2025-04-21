// src/pages/AdminDashboard.tsx
import { useEffect, useState, useCallback } from "react"; // Keep useCallback
import axios, { isAxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "../types";
import { useAuth } from "../context/AuthContext";

interface ApiErrorData {
  message?: string;
}

const AdminDashboard = () => {
  const { user } = useAuth(); // Get user from context
  // No need for separate typedUser, use 'user' directly where needed
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [demoteRole, setDemoteRole] = useState<{ [key: string]: "buyer" | "seller" }>({});
  const [isLoading, setIsLoading] = useState(false);

  const SUPERADMIN_EMAIL = import.meta.env.VITE_SUPERADMIN_EMAIL || "admin@example.com";

  // Stable token getter
  const getToken = useCallback((): string | null => {
      return localStorage.getItem("token");
  }, []);


  // *** Wrap handleApiError in useCallback ***
  const handleApiError = useCallback((error: unknown, defaultMessage: string) => {
    console.error("API Error:", error);
    let message = defaultMessage;
    if (isAxiosError(error)) {
      const errorData = error.response?.data as ApiErrorData | undefined;
      message = errorData?.message || error.message || defaultMessage;
      if (error.response?.status === 401) {
        message = `Authentication failed: ${message}. Please login again.`;
        // Consider calling logout() from useAuth here if the token is invalid
      } else if (error.response?.status === 403) {
         message = `Authorization failed: ${message}`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    // setError is stable from useState, no need to list as dependency
    setError(message);
  }, []); // <-- Empty dependency array ensures this function reference is stable


  // Memoize fetchUsers, depend on user object and stable helpers
  const fetchUsers = useCallback(async () => {
    // *** Use user directly from context ***
    if (!user || user.role !== "admin") {
      setUsers([]); // Clear users if access changes or is lost
      return;
    }

    const token = getToken();
    if (!token) {
      // handleApiError can be used here too for consistency
      handleApiError(new Error("Client Error: Token missing."), "Authentication token not found. Please login again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(""); // Clear error before fetch
    console.log("AdminDashboard: Fetching users..."); // Simplified log
    try {
      const res = await axios.get("http://localhost:5000/api/users/all", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("API /users/all response:", res.data); // Keep for debugging if needed
      if (Array.isArray(res.data)) {
        const fetchedUsers = res.data.map((u: any): User => ({
          // Ensure your User type matches fields like 'id', 'name', 'email', 'role'
          id: u.id || u._id,
          email: u.email || 'N/A',
          name: u.name || 'N/A', // Add name if available
          role: ["buyer", "seller", "admin"].includes(u.role) ? u.role : "buyer",
        }));
        setUsers(fetchedUsers);
        setSuccess(""); // Clear success message on new fetch
      } else {
        console.error("API response data is not an array:", res.data);
        handleApiError(new Error("Invalid data format"), "Received invalid user data format from server.");
        setUsers([]); // Clear users on invalid format
      }
    } catch (error: unknown) {
      // handleApiError is now stable
      handleApiError(error, "Failed to fetch users");
      setUsers([]); // Clear users on error
    } finally {
      setIsLoading(false);
    }
    // *** Update dependencies: depend on user object and stable functions ***
  }, [user, getToken, handleApiError]); // Depend on user, getToken, handleApiError


  useEffect(() => {
    console.log("AdminDashboard: useEffect running due to change in fetchUsers reference (should only run when user changes)."); // Debug
    // This effect runs whenever fetchUsers changes identity.
    // Since fetchUsers depends on 'user', this effect will run when 'user' changes.
    fetchUsers();
  }, [fetchUsers]);


  // Promote function (consider refetching)
  const promoteToAdmin = useCallback(async (userId: string) => { // Wrap in useCallback
    const token = getToken();
    if (!token) { handleApiError(new Error("Client Error: Token missing."), "Authentication required."); return; }
    setError(""); setSuccess(""); setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/promote",
        { userId, role: "admin" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message || "User promoted successfully.");
      // Re-fetch users to get the latest list after promotion
      fetchUsers();
      // Or use optimistic update:
      // setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: "admin" } : u)));
    } catch (error: unknown) {
       handleApiError(error, "Promotion failed");
    } finally {
       setIsLoading(false);
    }
    // Depend on stable functions
  }, [getToken, handleApiError, fetchUsers]);


  // Demote function (consider refetching)
  const demoteUser = useCallback(async (userId: string) => { // Wrap in useCallback
    const token = getToken();
    if (!token) { handleApiError(new Error("Client Error: Token missing."), "Authentication required."); return; }
    setError(""); setSuccess("");
    const role: "buyer" | "seller" = demoteRole[userId] || "buyer";
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/demote",
        { userId, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message || "User demoted successfully.");
      // Re-fetch users to get the latest list after demotion
      fetchUsers();
      // Or use optimistic update:
      // setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      // Clear the specific demote role selection
      setDemoteRole(prev => {
        const newState = {...prev};
        delete newState[userId];
        return newState;
      });
    } catch (error: unknown) {
      handleApiError(error, "Demotion failed");
    } finally {
       setIsLoading(false);
    }
     // Depend on stable functions and demoteRole state
  }, [getToken, handleApiError, fetchUsers, demoteRole]);


  // Access Denied Check (using user from context)
  if (!user || user.role !== "admin") {
    return (
      <div className="w-full px-4 py-6 text-center">
        <h1 className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
          Access Denied
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          You must be logged in as an admin to view this page.
        </p>
        {error && (
           <Alert variant="destructive" className="mt-4 text-left max-w-md mx-auto">
             <AlertDescription>{error}</AlertDescription>
           </Alert>
        )}
      </div>
    );
  }

  // Admin View Rendering
  return (
     <div className="w-full px-4 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Admin Dashboard</h1>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-300">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card-light dark:bg-card-dark shadow-lg w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Manage Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !users.length ? (
             <p className="text-muted-foreground text-center">Loading users...</p>
          ) : users.length > 0 ? (
            <ul className="space-y-4">
              {users.map((listUser) => {
                 const isSuperAdmin = listUser.email === SUPERADMIN_EMAIL;
                 // Use user.id directly from context for self check
                 const isSelf = user && listUser.id === user.id;
                 const canDemote = !isSuperAdmin && !isSelf;

                 return (
                    <li
                      key={listUser.id}
                      className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm sm:text-base border-b pb-3 last:border-b-0"
                    >
                      {/* User Details */}
                      <div className="flex flex-col flex-grow min-w-0">
                        <span className="font-medium truncate" title={listUser.email}>
                          {listUser.name || 'N/A'} ({listUser.email})
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 capitalize">{listUser.role}</span>
                        {isSuperAdmin && <span className="text-xs text-yellow-600 dark:text-yellow-400">(Super Admin)</span>}
                        {isSelf && <span className="text-xs text-blue-600 dark:text-blue-400">(You)</span>}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {listUser.role !== "admin" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => promoteToAdmin(listUser.id)}
                            disabled={isLoading}
                          >
                            Promote to Admin
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Select
                              value={demoteRole[listUser.id] || "buyer"}
                              onValueChange={(value) => setDemoteRole({ ...demoteRole, [listUser.id]: value as "buyer" | "seller" })}
                              disabled={!canDemote || isLoading}
                            >
                              <SelectTrigger className="w-[120px] text-sm" disabled={!canDemote || isLoading}>
                                <SelectValue placeholder="Demote to..." />
                              </SelectTrigger>
                              <SelectContent className="bg-background text-foreground border border-border shadow-lg">
                                <SelectItem value="buyer">Buyer</SelectItem>
                                <SelectItem value="seller">Seller</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => demoteUser(listUser.id)}
                              disabled={!canDemote || isLoading}
                              title={!canDemote ? (isSuperAdmin ? "Cannot demote Super Admin" : "Cannot demote self") : "Demote this user"}
                            >
                              Demote
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                 );
               })}
            </ul>
          ) : (
             !isLoading ? <p className="text-muted-foreground text-center">No users found.</p> : null
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;