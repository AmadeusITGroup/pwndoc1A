import { ref } from 'vue';
import jwtDecode from 'jwt-decode';
import { axiosInstance } from '../boot/axios';
import config from '../config/config.json'; 
import Router from '@/router'


// Determine login route based on SSO configuration

// Create a reactive user store
const user = ref({
  username: '',
  role: '',
  firstname: '',
  lastname: '',
  totpEnabled: false,
  roles: '',
});

const getToken = (username, password, totpToken) => {
  return new Promise((resolve, reject) => {
    const params = { username, password, totpToken };
    axiosInstance
      .post('users/token', params)
      .then((response) => {
        const token = response.data.datas.token;
        localStorage.setItem('token', token);
        user.value = jwtDecode(token);
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
};

const refreshToken = () => {
  return new Promise((resolve, reject) => {
    axiosInstance
      .get('users/refreshtoken')
      .then((response) => {
        const token = response.data.datas.token;
        localStorage.setItem('token', token);
        user.value = jwtDecode(token);
        resolve();
      })
      .catch((err) => {
        localStorage.removeItem('token');
        if (err.response && err.response.data) reject(err.response.data.datas);
        else reject('Invalid Token');
      });
  });
};

const destroyToken = () => {
  axiosInstance
    .delete('users/refreshtoken')
    .then(() => {
      clearUser();
      if(config.isSSO) document.location.href = 'https://example.com/SSOlogout';
      else Router.push('/login')
    })
    .catch((err) => {
      console.log(err)
    })
};

const initUser = (username, firstname, lastname, password) => {
  return new Promise((resolve, reject) => {
    const params = { username, password, firstname, lastname };
    axiosInstance
      .post('users/init', params)
      .then((response) => {
        const token = response.data.datas.token;
        user.value = jwtDecode(token);
        resolve();
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });
};

const isInit = () => {
  return axiosInstance.get('users/init', { timeout: 10000 });
};

const isAuth = () => {
  const token = localStorage.getItem('token');
  return !!(token && user.value && user.value.username);
};

const clearUser = () => {
  user.value = {
    username: '',
    role: '',
    firstname: '',
    lastname: '',
    roles: '',
  };
};

const isAllowed = (role) => {
  return (user.value.roles && user.value.roles.includes(role) || user.value.roles === '*');
};

const getProfile = () => {
  return axiosInstance.get('users/me');
};

const updateProfile = (user) => {
  return axiosInstance.put('users/me', user);
};

const getTotpQrCode = () => {
  return axiosInstance.get('users/totp');
};

const setupTotp = (totpToken, totpSecret) => {
  return axiosInstance.post('users/totp', { totpToken, totpSecret });
};

const cancelTotp = (totpToken) => {
  return axiosInstance.delete('users/totp', { data: { totpToken } });
};

export  {
    user,
    getToken,
    refreshToken,
    destroyToken,
    initUser,
    isInit,
    isAuth,
    clearUser,
    isAllowed,
    getProfile,
    updateProfile,
    getTotpQrCode,
    setupTotp,
    cancelTotp,
}