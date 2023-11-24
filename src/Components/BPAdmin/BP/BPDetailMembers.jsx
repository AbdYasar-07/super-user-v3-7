import { SelectButton } from "primereact/selectbutton";
import React, { useEffect, useState } from "react";
import "../../Styles/BPDetailMembers.css";
import Axios from "../../../Utils/Axios";
import axios from "axios";
import { useParams } from "react-router-dom";
import DataGridTable from "../../../Utils/DataGridTable";
import AppSpinner from "../../../Utils/AppSpinner";
import { Button } from "primereact/button";
import { useDispatch, useSelector } from "react-redux";
import { addManagementAccessToken } from "../../../store/auth0Slice";
import { assignMembersInGroup, getAllSystemGroupsFromAuth0 } from "../../BusinessLogics/Logics";
import AddUser from "../../Users/AddUser";
import ImportUserModal from "../../../Utils/ImportUserModal";
import TableData from "../../../Utils/TableData";
import { Badge } from "primereact/badge";
import { toast } from "react-toastify";

const BPDetailMembers = () => {
  const resourceTwo = process.env.REACT_APP_AUTH_MANAGEMENT_AUDIENCE;
  const resource = process.env.REACT_APP_AUTH_EXT_RESOURCE;
  const endpoint = process.env.REACT_APP_MANAGEMENT_API;
  const authorizationExtUrl = process.env.REACT_APP_AUTH_EXT_RESOURCE;
  const { bpId } = useParams();
  const dispatch = useDispatch();
  const auth0Context = useSelector((state) => state.auth0Context);
  const [members, setMembers] = useState([]);
  const [filterRecord, setFilteredRecord] = useState([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState("InBP");
  const [message, setMessage] = useState(
    "Individually Unassign Users From This BP"
  );
  const [showOutBP, setShowOutBP] = useState(false);
  const items = [
    { name: "Members in this BP", value: "InBP" },
    { name: "All Unassigned Members", value: "OutBP" },
  ];
  const [serverPaginate, setServerPagnitae] = useState({
    start: 0,
    length: 0,
    total: -1,
    processedRecords: 0,
    users: [],
  });
  const [allGroups, setAllGroups] = useState([]);
  const [unAssignedMembers, setUnAssignedMembers] = useState([]);
  const [selectedUnassignedMembers, setSelectedUnAssignedMembers] = useState([]);
  const [isUserAdded, setIsUserAdded] = useState(false);
  const [isTokenFetched, setIsTokenFteched] = useState(false);
  const [isPasteModelShow, setIsPasteModelShow] = useState(false);
  const [isPasteCancel, setIsPasteCancel] = useState(false);
  const [isTableShow, setIsTableShow] = useState(false);
  const [tableData, setTableData] = useState([]);
  useEffect(() => {
    setLoading(true);
    getMembersForBP(bpId);
    getMembersList(false);
  }, []);

  const filterUnassignedMembers = (members) => {
    return members.filter((member) => member?.BPID === "Unassigned");
  };
  const getRowSelected = (rowValues) => {
    setSelectedUnAssignedMembers(rowValues);
  };
  const getMembersForBP = async (bpId) => {
    if (!bpId) return;

    let url = `${resource}/groups/${bpId}/members`;
    const response = await Axios(url, "GET", null, localStorage.getItem("auth_access_token"), false, false, false);
    if (!axios.isAxiosError(response)) {
      setMembers(response?.users);
      handleUsersMapping(response?.users);
      setLoading(false);
      return response;
    } else {
      console.error("Error while getting members for a group :::", response?.cause?.message);
      setLoading(false);
      return null;
    }
  };
  const getCurrentData = async (data, action) => {

    switch (action?.toLowerCase()) {
      case "remove": {
        setLoading(true);
        await removeMemberFromCurrentBP(data.id, bpId);
        await getMembersList(false);
        break;
      }
      default: {
        console.log("No action triggered");
        break;
      }
    }
  };
  const removeMemberFromCurrentBP = async (memberId, bpId) => {
    let url = `${resource}/groups/${bpId}/members`;
    const body = [`${memberId}`];
    const response = await Axios(url, "DELETE", body, localStorage.getItem("auth_access_token"), false, false, false);
    if (!axios.isAxiosError(response)) {
      await getMembersForBP(bpId);
      setLoading(false);
      return response;
    } else {
      console.error("Error while removing member for a group :::", response?.cause?.message);
      setLoading(false);
      return null;
    }
  };
  const handleUsersMapping = (users) => {
    if (Array.isArray(users) && users.length > 0) {
      const actualUsers = users.map((user) => {
        return {
          id: user?.user_id,
          Name: user?.name,
          Email: user?.email,
          LatestLogin: formatTimestamp(user?.last_login),
          Logins: user?.logins_count,
          Connection: user?.identities[0]?.connection,
        };
      });
      setFilteredRecord(actualUsers);
    } else {
      setFilteredRecord([]);
    }
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return "Never";
    }
    const date = new Date(timestamp);
    const now = new Date();

    const diffInMilliseconds = Math.abs(now - date);
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };
  const renderOutBP = (tabValue) => {
    if (typeof tabValue === "string" && tabValue === "OutBP") {
      setMessage("Relate Users To This BP");
      setShowOutBP(true);
      return;
    } else {
      setMessage("Individually Unassign Users From This BP");
      setShowOutBP(false);
      setValue("InBP");
      return;
    }
  };
  const fetchManagementToken = async () => {
    const body = {
      grant_type: process.env.REACT_APP_AUTH_GRANT_TYPE,
      client_id: process.env.REACT_APP_M2M_CLIENT_ID,
      client_secret: process.env.REACT_APP_M2M_CLIENT_SECRET,
      audience: process.env.REACT_APP_AUDIENCE,
    };
    return await Axios(endpoint, "POST", body, null, true).then((response) => {
      dispatch(
        addManagementAccessToken({
          managementAccessToken: response.access_token,
        })
      );
      return response;
    });
  };
  const getMembersList = async (isBpFirst) => {
    setLoading(true);
    let managementResponse = null;
    if (!auth0Context?.managementAccessToken && auth0Context?.managementAccessToken?.length === 0) {
      managementResponse = await fetchManagementToken();
    }
    let accessToken = managementResponse?.access_token ? managementResponse?.access_token : auth0Context?.managementAccessToken;
    let response = await fetchAuth0Users(100, "conception", accessToken, serverPaginate);
    const groupsResponse = await getAllAuth0Groups(response);
    if (Array.isArray(response.users) && Array.isArray(groupsResponse)) {
      const members = await filterUsersByDatabase(response.users, "conception", groupsResponse, isBpFirst);
      const assignedMembersResponse = await getMembersForBP(bpId);
      if (assignedMembersResponse?.users.length > 0) {
        const actualMembers = members.filter((member) => {
          return assignedMembersResponse?.users.every((user) => user?.user_id !== member?.id);
        });
        setUnAssignedMembers(filterUnassignedMembers(actualMembers));
      } else {
        setUnAssignedMembers(filterUnassignedMembers(members));
      }
      setAllGroups(groupsResponse);
    }
    setLoading(false);
  };
  const filterUsersBy = (bpFirst, filteredUsers, filteredUsersNotInBp) => {
    if (bpFirst) {
      return [...filteredUsers, ...filteredUsersNotInBp];
    } else {
      return [...filteredUsersNotInBp, ...filteredUsers];
    }
  };
  function hasSingleIdentityWithConnectionName(user, connectionName) {
    if (
      user &&
      user.identities &&
      Array.isArray(user.identities) &&
      user.identities.length === 1
    ) {
      return user.identities[0].connection === connectionName;
    }

    return false;
  }
  const filterUsersByDatabase = async (users, databaseName, groupsResponse, isBpFirst) => {
    if (users.length === 0) return;
    // criteria 1 : filter for Conception database
    const filteredByConceptionDatabase = users.filter((user) => {
      if (hasSingleIdentityWithConnectionName(user, databaseName)) return user;
    });

    // criteria 2 : filter for BP_
    const filteredUsers = filteredByConceptionDatabase.filter((user) =>
      user?.app_metadata?.authorization?.groups?.some((group) =>
        group.startsWith("BP_")
      )
    );

    // criteria 3 : filter for non BP_
    const filteredUsersNotInBp = filteredByConceptionDatabase.filter(
      (user) =>
        !user?.app_metadata?.authorization?.groups?.some((group) =>
          group.startsWith("BP_")
        )
    );

    let clubedUsers = filterUsersBy(isBpFirst, filteredUsers, filteredUsersNotInBp);

    if (Array.isArray(clubedUsers)) {
      // setActualMembers(clubedUsers);
      const members = clubedUsers.map((filteredUser) => {
        let indexOfBpGroup = -1;
        filteredUser?.app_metadata?.authorization?.groups?.forEach(
          (group, index) => {
            if (String(group).startsWith("BP_")) {
              indexOfBpGroup = index;
            }
          }
        );
        return {
          id: filteredUser.user_id,
          Connection: databaseName,
          Name: filteredUser.name,
          Email: filteredUser.email,
          LatestLogin: formatTimestamp(filteredUser.last_login),
          Logins: filteredUser.logins_count,
          BPID: filteredUser?.app_metadata?.authorization?.groups[indexOfBpGroup] &&
            filteredUser?.app_metadata?.authorization?.groups[
              indexOfBpGroup
            ].substring(3).length == 10
            ? filteredUser?.app_metadata?.authorization?.groups[
              indexOfBpGroup
            ].substring(3)
            : "Unassigned",
          BPName: groupsResponse?.filter(
            (group) =>
              group?.groupName ===
              filteredUser?.app_metadata?.authorization?.groups[indexOfBpGroup]
          )[0]
            ? groupsResponse?.filter(
              (group) =>
                group?.groupName ===
                filteredUser?.app_metadata?.authorization?.groups[
                indexOfBpGroup
                ]
            )[0]?.groupDescription
            : "-",
        };
      });

      return members;
    }
  };
  const getAllAuth0Groups = async () => {
    let url = `${authorizationExtUrl}/groups`;
    const response = await getAllSystemGroupsFromAuth0(
      url,
      localStorage.getItem("auth_access_token")
    );
    if (response) {
      const filteredResponse = response?.groups
        ?.filter((group) => String(group?.name).includes("BP_"))
        .map((group) => {
          return {
            groupId: group?._id,
            groupName: group?.name,
            groupDescription: group?.description,
          };
        });
      return filteredResponse;
    }
  };
  const fetchAuth0Users = async (perPage, database, managementAccessToken, serverPaginate) => {
    if (serverPaginate.processedRecords === serverPaginate.total) {
      return serverPaginate;
    }

    let url = `${resourceTwo}users?per_page=${perPage}&include_totals=true&connection=${database}&search_engine=v3&page=${serverPaginate.start}`;

    const response = await Axios(url, "get", null, managementAccessToken, false);

    const updatedServerPaginate = {
      start: serverPaginate.start + 1,
      length: response?.length,
      total: response?.total,
      processedRecords: serverPaginate.processedRecords + response?.length,
      users: [...serverPaginate?.users, ...response?.users],
    };

    setServerPagnitae(updatedServerPaginate);

    // recursive call
    return await fetchAuth0Users(
      perPage,
      database,
      managementAccessToken,
      updatedServerPaginate
    );
  };
  const assignMembersIntoGroup = async () => {
    let data = [];
    selectedUnassignedMembers.map((unAssignedMember) => {
      data?.push(unAssignedMember?.id);
    });
    let response = await assignMembersInGroup(bpId, data);
    if (response === "200") {
      await getMembersList(false);
      toast.success(`Member${selectedUnassignedMembers?.length === 1 ? "" : "'s"} successfully added`, { theme: "colored" });
    } else {
      toast.error(response, { theme: "colored" });
    }
    setSelectedUnAssignedMembers([]);
  };
  const getMemberDetail = async (memberDetail) => {

    let data = [memberDetail?.user_id];
    let response = await assignMembersInGroup(bpId, data);
    if (response === "200") {
      await getMembersList(false);
      toast.success(`Member successfully added`, { theme: "colored" });
    } else {
      toast.error(response, { theme: "colored" });
    }
  }

  const getMembersIdFromTable = async (getmembersId) => {

    let data = [];
    getmembersId.map((memberId) => {
      data?.push(memberId);
    });
    let response = await assignMembersInGroup(bpId, data);
    if (response === "200") {
      await getMembersList(false);
      toast.success(`Member${data?.length === 1 ? "" : "'s"} successfully added`, { theme: "colored" });
    } else {
      toast.error(response, { theme: "colored" });
    }
  }
  useEffect(() => {
    if (value === "OutBP") {
      setSelectedUnAssignedMembers([]);
    }
    renderOutBP(value);
  }, [value]);

  return (
    <>
      <div
        className="text-start"
      // style={{ marginTop: "30px", position: "relative", right: "465px" }}
      >
        <div
          className="mt-3"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
          }}
        >
          {/*  mt-3" ; */}
          <SelectButton
            value={value}
            onChange={(e) => setValue(e.value)}
            optionLabel="name"
            options={items}
          />
          {showOutBP && (
            <>
              {selectedUnassignedMembers?.length === 0 ? (
                <div className="me-3">
                  {" "}
                  <div>
                    <AddUser
                      buttonLabel="Member"
                      setIsUserAdded={setIsUserAdded}
                      isTokenFetched={isTokenFetched}
                      setIsPasteModelShow={setIsPasteModelShow}
                      isPasteCancel={isPasteCancel}
                      setIsPasteCancel={setIsPasteCancel}
                      getMemberDetail={getMemberDetail}
                      isForMember={true}
                    />
                  </div>
                  <div>
                    <ImportUserModal
                      action="Add_User"
                      isPasteModelShow={isPasteModelShow}
                      setIsPasteCancel={setIsPasteCancel}
                      setTableData={setTableData}
                      setIsTableShow={setIsTableShow}
                    />
                  </div>
                  <div>
                    <TableData
                      columnType={"user"}
                      data={tableData}
                      isTableShow={isTableShow}
                      setIsTableShow={setIsTableShow}
                      setTableData={setTableData}
                      setIsPasteModelShow={setIsPasteModelShow}
                      setIsPasteCancel={setIsPasteCancel}
                      getMembersIdFromTable={getMembersIdFromTable}
                      isForMember={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="position-relative">
                  <Button
                    type="button"
                    label={
                      selectedUnassignedMembers?.length === 1
                        ? "Assign Member"
                        : "Assign Member's"
                    }
                    icon="pi pi-users"
                    style={{
                      borderRadius: "7px",
                      marginRight: "30px",
                    }}
                    onClick={() => {
                      assignMembersIntoGroup();
                    }}
                  ></Button>
                  <Badge
                    style={{
                      position: "absolute",
                      right: "12px ",
                      top: "-14px",
                      fontSize: "12px",
                      background: "#1a9e86",
                    }}
                    value={selectedUnassignedMembers?.length}
                    severity="success"
                  ></Badge>
                </div>
              )}
            </>
          )}
        </div>
        <div className="text-center">{loading && <AppSpinner />}</div>
        {!loading && (
          <div>
            <p
              className="pMessage fw-light"
              style={{ color: "rgb(114, 114, 114)" }}
            >
              {message}
            </p>
          </div>
        )}
      </div>
      <div>
        <div style={{ position: "relative", left: "467px !important" }}>
          {!loading && !showOutBP && (
            <DataGridTable
              data={filterRecord}
              rowHeader={[
                "Name",
                "Email",
                "Latest Login",
                "Logins",
                "Connection",
                "Action",
              ]}
              getCurrentData={getCurrentData}
              loading={loading}
              action={true}
              showTrashOnly={true}
              emptyMessage={"No Members Found."}
            />
          )}
          {!loading && showOutBP && (
            <>
              {/* <p>All Unassigned members goes here...</p> */}
              <DataGridTable
                data={unAssignedMembers}
                rowHeader={[
                  "Name",
                  "Email",
                  "Latest Login",
                  "Logins",
                  "Connection",
                ]}
                getCurrentData={getCurrentData}
                getRowSelected={getRowSelected}
                loading={loading}
                action={false}
                showTrashOnly={true}
                emptyMessage={"No Members Found."}
                isCheckbox={true}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default BPDetailMembers;
