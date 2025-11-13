import React from "react";
import { NavLink } from "react-router";

const Navigation: React.FC = () => {
    return (
        <nav className="flex">
            <span className="p-2">SnapDash</span>
            <NavLink to="/" end className="p-2">Home</NavLink>
            <NavLink to="/assistant" className="p-2">Assistant</NavLink>
        </nav>
    );
};

export default Navigation;