ArchivesSpace::Application.routes.draw do
  match('/plugins/dartmouth_bulk_container_update/bulk_update_instances' => 'instance_bulk_update#update', :via => [:post])
  match('/plugins/dartmouth_bulk_container_update/bulk_update_instances' => 'instance_bulk_update#summary', :via => [:get])

end
