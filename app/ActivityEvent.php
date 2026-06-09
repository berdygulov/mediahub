<?php

namespace App;

enum ActivityEvent: string
{
    case Login = 'login';
    case Logout = 'logout';
    case FolderAccessGranted = 'folder_access_granted';
    case FolderAccessRevoked = 'folder_access_revoked';
}
