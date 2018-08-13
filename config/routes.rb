Rails.application.routes.draw do
  root 'soil#index'
  get '*path', to: 'soil#index'
end