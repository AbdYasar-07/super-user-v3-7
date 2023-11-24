import React, { useEffect, useState } from 'react'
import NestedContentOutlet from '../../Contents/NestedContentOutlet';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { SelectButton } from 'primereact/selectbutton';

const BPDetailOutlet = () => {

    const [value, setValue] = useState("Members");
    const { bpId } = useParams();
    const navigate = useNavigate();
    const items = [
        { name: 'Members', value: "Members" },
        { name: 'Store Details', value: "StoreDetails" },
        { name: 'Service Details', value: "ServiceDetails" },
        { name: 'SAP Details', value: "SAPDetails" },
        { name: 'COMS Details', value: "COMSDetails" }
    ];

    const handleSelectedTab = (tabValue) => {
        switch (tabValue) {
            case "Members": {
                navigate(`/bp/${bpId}/tabs/members`);
                break;
            }
            case "StoreDetails": {
                navigate(`/bp/${bpId}/tabs/store`);
                break;
            }
            case "ServiceDetails": {
                navigate(`/bp/${bpId}/tabs/service`);
                break;
            }
            case "SAPDetails": {
                break;
            }
            case "COMSDetails": {
                navigate(`/bp/${bpId}/tabs/coms`);
                break;
            }
            default: {
                setValue("Members");
                navigate(`/bp/${bpId}/tabs/members`);
                break;
            }
        }
    };

    const onTabChange = (value) => {
        setValue(value);
        handleSelectedTab(value);
    };

    useEffect(() => {
        handleSelectedTab(value);
    }, [])


    return (
        <>
            <div style={{ display: "flex" }}>
                <SelectButton value={value} optionLabel="name" options={items} onChange={(e) => onTabChange(e.value)} />
            </div>
            <Outlet />
        </>
    );
}

export default BPDetailOutlet;
